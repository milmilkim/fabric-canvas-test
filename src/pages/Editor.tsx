/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { fabric } from 'fabric';
import { useEffect, useRef, useState, useCallback } from 'react';

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
  const [history, setHistory] = useState<FabricJson[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // ---------- ref (동기적)
  // 실행 취소나, 상태 변경을 하는 경우에는 히스토리가 쌓이며 안 됨 (true이면 히스토리가 쌓이지 않는다)
  const isHistoryLockedRef = useRef<boolean>(false);
  // 실행취소를 하기 위한 인덱스
  const currentIndexRef = useRef<number | null>(null);

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
    const json = fabricRef.current?.toJSON();
    window.localStorage.setItem('json', JSON.stringify(json));
    alert('저장되었따');
  };

  // 히스토리 추가를 방지하는 용도
  const lockHistory = () => (isHistoryLockedRef.current = true);
  const unlockHistory = () => (isHistoryLockedRef.current = false);

  const jsonToImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!fabricRef.current) {
        reject('fabricRef.current is not defined.');
        return;
      }

      const tempCanvas = new fabric.Canvas(null);
      tempCanvas.setWidth(dimensions.width);
      tempCanvas.setHeight(dimensions.height);

      const jsonData = fabricRef.current.toJSON();

      tempCanvas.loadFromJSON(jsonData, () => {
        if (backgroundImage) {
          tempCanvas.setBackgroundImage(backgroundImage, () => {
            tempCanvas.renderAll();
            resolve(tempCanvas.toDataURL());
            tempCanvas.dispose();
          });
        } else {
          tempCanvas.renderAll();
          resolve(tempCanvas.toDataURL());
          tempCanvas.dispose();
        }
      });
    });
  };

  const saveImage = async () => {
    const dataUrl = await jsonToImage();

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
      // 이미지에 맞춘 캔버스 사이즈 변경
      fabricRef.current?.setWidth(img.width!);
      fabricRef.current?.setHeight(img.height!);
      changeSize('width', img.width!);
      changeSize('height', img.height!);

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
        setBackgroundImage(dataUrl);
        setCanvasBackgroundImage(dataUrl);
      };

      reader.readAsDataURL(file);
    }
  };
  const changeState = useCallback((payload: FabricJson) => {
    lockHistory();

    fabricRef.current?.loadFromJSON(payload, () => {
      fabricRef.current?.renderAll();
      unlockHistory();
    });
  }, []);

  const undo = () => {
    if (history.length > 1) {
      lockHistory();

      // 초기화
      if (currentIndexRef.current === null) {
        currentIndexRef.current = history.length - 1;
      }

      // 하나 이전 값으로 변경
      currentIndexRef.current = currentIndexRef.current - 1;

      if (currentIndexRef.current < 0) {
        currentIndexRef.current = 0;
        // 히스토리가 아무것도 없어서 다 지움
        fabricRef.current?.clear();
        unlockHistory();
        return;
      }

      const prevState = history[currentIndexRef.current];

      changeState(prevState);

      unlockHistory();
    }
  };

  const saveHistory = () => {
    // 히스토리 저장
    if (!fabricRef.current) return;
    if (isHistoryLockedRef.current) {
      // 실행 취소나 히스토리 변경일 때는 히스토리를 저장하지 않는다
      return;
    }
    // 여기서부터는 새로운 변경건이라 실행취소 인덱스를 초기화 한다
    currentIndexRef.current = null;
    const newJson: FabricJson = fabricRef.current?.toJSON() as FabricJson;
    setHistory((prevHistory) => [...prevHistory, newJson]);
  };

  useEffect(() => {
    const initFabric = async () => {
      // 폰트 로딩 여부 체크 (폰트가 불러온 후 캔버스를 표시해야 폰트가 항상 적용됨)
      const font = new FontFaceObserver('DOSPilgiMedium');
      await font.load();

      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 1000,
      });

      // 로컬스토리지에 있는 json 데이터를 불러오기 위한 부분 (임시)
      const json = window.localStorage.getItem('json');
      const parsedJson = json ? JSON.parse(json) : null;
      if (parsedJson && typeof parsedJson === 'object') {
        fabricRef.current.loadFromJSON(parsedJson, () => {
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
      <div className='flex space-x-3 '>
        <Input
          onChange={onChangeInput}
          name='width'
          className='w-36'
          placeholder='가로 픽셀'
          type='number'
          min='0'
          max='2000'
        />
        <Input
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

      <div className='flex'>
        <canvas
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
          }}
          className='border border-gray-700'
          ref={canvasRef}></canvas>
      </div>

      <div className='space-x-1'>
        <Button onClick={saveState} variant='outline'>
          저장
        </Button>
        <Button onClick={saveImage} variant='default'>
          이미지 저장
        </Button>
      </div>

      <div className='overflow-y-auto h-96 bg-slate-300'>
        <h1 className='font-bold p-3'>History</h1>
        <hr />
        {/* 최신순 정렬을 위한 reverse */}
        {history
          .slice()
          .reverse()
          .map((item, index) => (
            <div
              onClick={() => changeState(item)}
              key={index}
              className='h-20 p-1'>
              <div className={'w-full h-8'}>
                히스토리 {history.length - 1 - index}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Editor;
