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

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  const [newText, setNewText] = useState<string>('');
  const [newColor, setNewColor] = useState<string>('black');

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

  function saveState() {
    const json = fabricRef.current?.toJSON();
    console.log(json);
  }

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

      console.log(file);
      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCanvasBackgroundImage(dataUrl);
      };

      reader.readAsDataURL(file);
    }
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
    };

    const disposeFabric = () => {
      fabricRef.current!.dispose();
    };

    initFabric();

    return () => {
      disposeFabric();
    };
  }, []);

  return (
    <>
      <div className='flex space-x-3'>
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

      <Input onChange={handleFile} className='mt-3 w-96' type='file' />

      <div className=' max-w-2xl'>
        <Textarea
          value={newText}
          onChange={handleText}
          className='mt-3 w-96'></Textarea>
        <Button onClick={addText} variant='outline' className='mt-2'>
          추가
        </Button>
        <Button
          className='mt-3 ml-2'
          onClick={deleteActiveObject}
          variant='destructive'>
          선택 삭제
        </Button>
        <CirclePicker color={newColor} onChange={handleColorChange} />
      </div>

      <div className='mb-3'></div>

      <div className='flex'>
        <canvas
          className='border border-gray-700 overflow-scroll'
          ref={canvasRef}></canvas>
      </div>

      <Button className='mt-3 ml-2' onClick={saveState} variant='secondary'>
        추출
      </Button>
    </>
  );
}

export default App;
