/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { fabric } from 'fabric';
import { useEffect, useRef, useState } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { CirclePicker, ColorResult } from 'react-color';

import FontFaceObserver from 'fontfaceobserver';

interface Dimensions {
  width: number;
  height: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricBackgroundImage = any; // 라이브러리에 type이 따로 없는 거 같음..

interface FabricJson {
  version: string;
  objects: fabric.Object[];
  backgroundImage: FabricBackgroundImage;
}

function Editor() {
  // ---------- DOM Element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  // ----------- state
  const [newText, setNewText] = useState<string>('');
  const [newColor, setNewColor] = useState<string>('black');

  // ---------- ref (동기적)
  // 실행 취소나, 상태 변경을 하는 경우에는 히스토리가 쌓이며 안 됨 (true이면 히스토리가 쌓이지 않는다)
  const isHistoryLockedRef = useRef<boolean>(false);
  // 실행취소를 하기 위한 인덱스
  const currentIndexRef = useRef<number>(-1);
  // 히스토리
  const historyRef = useRef<FabricJson[]>([]);
  // 원본 이미지 사이즈 복원용
  const originalImgSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // 캔버스에 텍스트 추가
  const addText = () => {
    const text = new fabric.Textbox(newText, {
      left: 100,
      top: 100,
      fontFamily: 'DOSPilgiMedium',
      editable: true,
      fill: newColor,
      dirty: true,
    });
    fabricRef.current?.add(text);
    setNewText('');
  };

  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 800,
    height: 800,
  });

  const changeSize = (type: 'width' | 'height', size: number) => {
    const next = {
      ...dimensions,
      [type]: size,
    };
    setDimensions(next);
  };

  const saveState = () => {
    // 로컬스토리지에 현재 캔버스만 저장
    const json = fabricRef.current?.toJSON([
      'selectable',
      'evented',
      'left',
      'top',
      'scaleX',
      'scaleY',
      'width',
      'height',
    ]);
    window.localStorage.setItem('json', JSON.stringify(json));
    alert('저장되었따');
  };

  // 히스토리 추가를 방지하는 용도
  const lockHistory = () => {
    isHistoryLockedRef.current = true;
  };

  const unlockHistory = () => {
    isHistoryLockedRef.current = false;
  };

  const getImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!fabricRef.current) {
        reject('fabricRef.current is not defined.');
        return;
      }

      // 현재 캔버스의 스케일 팩터를 계산
      const currentScaleFactor =
        fabricRef.current.width! /
        (originalImgSizeRef.current.width || fabricRef.current.width!);

      const tempCanvas = new fabric.Canvas(null);

      tempCanvas.setWidth(fabricRef.current.width!);
      tempCanvas.setHeight(fabricRef.current.height!);

      const jsonData = fabricRef.current?.toJSON();

      tempCanvas.loadFromJSON(jsonData, () => {
        // 모든 객체의 위치와 크기 조정
        tempCanvas.forEachObject(
          (
            obj: fabric.Object & {
              left?: number;
              top?: number;
              scaleX?: number;
              scaleY?: number;
            }
          ) => {
            if (obj.scaleX) obj.scaleX /= currentScaleFactor;
            if (obj.scaleY) obj.scaleY /= currentScaleFactor;
            if (obj.left) obj.left /= currentScaleFactor;
            if (obj.top) obj.top /= currentScaleFactor;
            obj.setCoords(); // 객체의 좌표를 다시 설정
          }
        );

        // 캔버스 크기 변경
        tempCanvas.setWidth(
          originalImgSizeRef.current.width || fabricRef.current!.width!
        );
        tempCanvas.setHeight(
          originalImgSizeRef.current.height || fabricRef.current!.height!
        );

        const url = tempCanvas.toDataURL({
          format: 'png',
          quality: 1,
        });

        resolve(url);
      });
    });
  };

  const saveImage = async () => {
    const dataUrl = await getImage();

    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;

    link.download = 'download-image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 선택된 오브젝트 삭제
  const deleteActiveObject = () => {
    const activeObject = fabricRef.current?.getActiveObject();

    if (activeObject) {
      fabricRef.current?.remove(activeObject);
    }

    fabricRef.current?.renderAll();
  };

  /**
   *
   * UI 관련
   */

  const onChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.currentTarget.value);
    const name = e.currentTarget.name as 'width' | 'height';

    changeSize(name, value);
  };

  const handleText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value;
    setNewText(value);
  };

  const changeCanvasSize = () => {
    if (fabricRef.current) {
      fabricRef.current.setWidth(dimensions.width);
      fabricRef.current.setHeight(dimensions.height);
      fabricRef.current.renderAll();
    }
  };

  const handleColorChange = (color: ColorResult) => {
    setNewColor(color.hex);

    const activeObject = fabricRef.current?.getActiveObject();
    if (activeObject) {
      activeObject.fill = color.hex;
      activeObject.dirty = true;
      fabricRef.current?.renderAll();
      saveHistory();
    }
  };

  const setCanvasBackgroundImage = (dataUrl: string) => {
    fabric.Image.fromURL(dataUrl, (img) => {
      originalImgSizeRef.current.width = img.width!;
      originalImgSizeRef.current.height = img.height!;

      const canvasWidth = 500; //캔버스 최대 가로폭
      const scaleFactor = canvasWidth / originalImgSizeRef.current.width;
      const canvasHeight = originalImgSizeRef.current.height * scaleFactor;

      img.left = 0;
      img.top = 0;
      img.scaleX = scaleFactor;
      img.scaleY = scaleFactor;
      img.selectable = false;
      img.evented = false;

      fabricRef.current?.setWidth(canvasWidth);
      fabricRef.current?.setHeight(canvasHeight);
      fabricRef.current?.renderAll();
      fabricRef.current?.add(img);

      fabricRef.current?.renderAll();
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCanvasBackgroundImage(dataUrl);
      };

      reader.readAsDataURL(file);
    }
  };
  const changeState = (payload: FabricJson) => {
    lockHistory();
    fabricRef.current?.loadFromJSON(payload, () => {
      fabricRef.current?.renderAll();
      unlockHistory();
    });
  };

  const undo = () => {
    // 초기화
    if (currentIndexRef.current <= 0 || history.length < 1) {
      return;
    }

    // 하나 이전 값으로 변경

    const prevState = historyRef.current[currentIndexRef.current - 1];
    currentIndexRef.current = currentIndexRef.current - 1;

    changeState(prevState);
  };

  const saveHistory = () => {
    // 히스토리 저장
    if (!fabricRef.current) return;
    if (isHistoryLockedRef.current) {
      return;
    }

    const newJson: FabricJson = fabricRef.current?.toJSON([
      'selectable',
      'evented',
      'left',
      'top',
      'scaleX',
      'scaleY',
    ]) as FabricJson; // 명시적으로 포함해야 하는 항목

    historyRef.current = [...historyRef.current, newJson];
    currentIndexRef.current = historyRef.current.length - 1;
  };

  useEffect(() => {
    const initFabric = async () => {
      console.log('init...');

      // 폰트 로딩 여부 체크 (폰트가 불러온 후 캔버스를 표시해야 폰트가 항상 적용됨)
      const font = new FontFaceObserver('DOSPilgiMedium');
      await font.load();

      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        width: 500,
        height: 500,
      });

      // 로컬스토리지에 있는 json 데이터를 불러오기 위한 부분 (임시)
      const json = window.localStorage.getItem('json');
      const parsedJson = json ? JSON.parse(json) : null;
      if (parsedJson && typeof parsedJson === 'object') {
        fabricRef.current.loadFromJSON(parsedJson, () => {
          if (parsedJson.width && parsedJson.height) {
            fabricRef.current!.setWidth(parsedJson.width);
            fabricRef.current!.setHeight(parsedJson.height);
          }
          fabricRef.current?.renderAll();
        });
      }

      // fabric.js의 이벤트를 추가함
      // 이벤트 종류 - http://fabricjs.com/events
      fabricRef.current?.on('object:modified', saveHistory);
      fabricRef.current?.on('object:added', saveHistory);
      fabricRef.current?.on('object:removed', saveHistory);
    };

    const disposeFabric = () => {
      fabricRef.current!.dispose();
    };

    initFabric();

    return () => {
      disposeFabric();
      fabricRef.current?.off('object:modified', saveHistory);
      fabricRef.current?.off('object:added', saveHistory);
      fabricRef.current?.off('object:removed', saveHistory);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Z (Cmd + Z for Mac) 를 확인
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // 활성화된 엘리먼트가 입력 필드가 아닌 경우
        if (
          document.activeElement &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault(); // 기본 동작을 중단
          undo(); // 실행취소 함수 호출
        }
      }
    };

    // 이벤트 리스너 추가
    window.addEventListener('keydown', handleKeyDown);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo]);

  return (
    <div className='space-y-1'>
      <p className='mb-1'>
        테스트용으로 이미지를 로컬스토리지에 저장하기 때문에 너무 크면 저장 안
        됨!
      </p>
      <div className='flex space-x-3 '>
        <Input
          value={dimensions.width}
          onChange={onChangeInput}
          name='width'
          className='w-36'
          placeholder='가로 픽셀'
          type='number'
          min='0'
          max='2000'
        />
        <Input
          value={dimensions.height}
          onChange={onChangeInput}
          name='height'
          className='w-36'
          placeholder='세로 픽셀'
          type='number'
          min='0'
          max='2000'
        />

        <Button onClick={changeCanvasSize} variant='outline'>
          변경
        </Button>
      </div>

      <Input onChange={handleFile} className='w-96' type='file' />

      <div className=' max-w-2xl'>
        <Textarea
          value={newText}
          onChange={handleText}
          className='w-96'></Textarea>
        <Button onClick={addText} variant='outline' className='mt-2'>
          추가
        </Button>
        <Button
          className='ml-2'
          onClick={deleteActiveObject}
          variant='destructive'>
          선택 삭제
        </Button>

        <Button className='ml-2' onClick={undo} variant='ghost'>
          실행 취소
        </Button>

        <div className='my-5'>
          <CirclePicker color={newColor} onChange={handleColorChange} />
        </div>
      </div>

      <div className='overflow-auto'>
        <div>
          <canvas
            className='border border-gray-700 overflow-x-scroll overflow-y-scroll'
            ref={canvasRef}></canvas>
        </div>
      </div>

      <div className='space-x-1'>
        <Button onClick={saveState} variant='outline'>
          저장
        </Button>
        <Button onClick={saveImage} variant='default'>
          이미지 저장
        </Button>
      </div>
    </div>
  );
}

export default Editor;
