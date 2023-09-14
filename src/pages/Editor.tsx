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

interface FabricJson {
  version: string;
  objects: fabric.Object[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backgroundImage: any;
}

function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  const [newText, setNewText] = useState<string>('');
  const [newColor, setNewColor] = useState<string>('black');

  const [history, setHistory] = useState<FabricJson[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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

  function saveState() {
    const json = fabricRef.current?.toJSON();
    window.localStorage.setItem('json', JSON.stringify(json));
    alert('저장되었따');
  }

  const jsonToImage = async (json: FabricJson): Promise<string> => {
    return new Promise((resolve) => {
      const tempCanvas = new fabric.Canvas(null);

      tempCanvas.loadFromJSON(json, () => {
        const boundingRect = tempCanvas.getObjects().reduce(
          (acc, obj) => {
            const objBounding = obj.getBoundingRect();
            return {
              left: Math.min(acc.left, objBounding.left),
              top: Math.min(acc.top, objBounding.top),
              right: Math.max(acc.right, objBounding.left + objBounding.width),
              bottom: Math.max(
                acc.bottom,
                objBounding.top + objBounding.height
              ),
            };
          },
          {
            left: Number.POSITIVE_INFINITY,
            top: Number.POSITIVE_INFINITY,
            right: Number.NEGATIVE_INFINITY,
            bottom: Number.NEGATIVE_INFINITY,
          }
        );

        // 중심점 계산
        const centerX = (boundingRect.left + boundingRect.right) / 2;
        const centerY = (boundingRect.top + boundingRect.bottom) / 2;

        // 정사각형의 크기 계산
        const size = Math.max(
          boundingRect.right - boundingRect.left,
          boundingRect.bottom - boundingRect.top
        );

        // 캔버스 크기 및 뷰포트 설정
        tempCanvas.setDimensions({ width: size, height: size });
        tempCanvas.setViewportTransform([
          1,
          0,
          0,
          1,
          -centerX + size / 2,
          -centerY + size / 2,
        ]);

        // 결과 이미지로 변환
        const dataUrl = tempCanvas.toDataURL();
        resolve(dataUrl);

        tempCanvas.dispose();
      });
    });
  };
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

  const deleteActiveObject = () => {
    const activeObject = fabricRef.current?.getActiveObject();

    if (activeObject) {
      fabricRef.current?.remove(activeObject);
    }

    fabricRef.current?.renderAll();
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
      if (fabricRef.current) {
        fabricRef.current.setWidth(img.width!);
        fabricRef.current.setHeight(img.height!);
        fabricRef.current.setBackgroundImage(img, () => {
          fabricRef.current?.renderAll();
        });
      }

      fabricRef.current?.setBackgroundImage(img, () => {
        fabricRef.current?.renderAll();
      });
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

  const undo = () => {
    if (history.length > 1) {
      changeState(history[history.length - 2]);
    } 
  };

  const saveHistory = () => {
    // 작업 내역 임시 저장
    if (!fabricRef.current) return;
    const newJson: FabricJson = fabricRef.current?.toJSON() as FabricJson;
    setHistory((prevHistory) => [...prevHistory, newJson]);
  };

  const changeState = (payload: FabricJson) => {
    fabricRef.current?.loadFromJSON(payload, () => {
      fabricRef.current?.renderAll();
    });

    setHistory([]);
  };

  useEffect(() => {
    const initFabric = async () => {
      // 폰트 로딩 여부 체크
      const font = new FontFaceObserver('DOSPilgiMedium');
      await font.load();

      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 1000,
      });

      const json = window.localStorage.getItem('json');
      const parsedJson = json ? JSON.parse(json) : null;
      if (parsedJson && typeof parsedJson === 'object') {
        fabricRef.current.loadFromJSON(parsedJson, () => {
          fabricRef.current?.renderAll();
        });
      }

      fabricRef.current?.on('object:modified', () => {
        saveHistory();
      });

      fabricRef.current?.on('object:added', () => {
        saveHistory();
      });

      fabricRef.current?.on('object:removed', () => {
        saveHistory();
      });
    };

    const disposeFabric = () => {
      fabricRef.current!.dispose();
    };

    initFabric();

    return () => {
      disposeFabric();
      fabricRef.current?.off('object:modified', saveHistory);
    };
  }, []);

  useEffect(() => {
    const convertLastToJson = async () => {
      // 히스토리의 마지막 아이템만을 확인
      const lastItem = history[history.length - 1];
      if (!lastItem) return;

      const url = await jsonToImage(lastItem);
      setImageUrls((prevUrls) => [...prevUrls, url]);
    };

    convertLastToJson();
  }, [history]);

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
          className='border border-gray-700 overflow-scroll'
          ref={canvasRef}></canvas>
      </div>

      <div className='space-x-1'>
        <Button onClick={saveState} variant='outline'>
          저장
        </Button>
        <Button variant='default'>이미지 저장</Button>
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
              className=' h-20 p-1'>
              <div className=' w-8 h-8'></div>
              히스토리 {history.length - 1 - index}
            </div>
          ))}
      </div>
    </div>
  );
}

export default Editor;
