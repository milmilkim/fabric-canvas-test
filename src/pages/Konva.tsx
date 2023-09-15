import { Stage, Layer, Text, Transformer } from 'react-konva';
import React, { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { CirclePicker } from 'react-color';

const Editor = () => {
  const [texts, setTexts] = useState<
    { text: string; color: string; fontFamily: string }[]
  >([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // const [newText, setNewText] = useState<string>('');
  const [editingText, setEditingText] = useState<string | null>(null);
  // const [selectedId, setSelectedId] = useState<number | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleTextClick = (id: number, node: Konva.Text) => {
    setSelectedId(id);
    setEditingText(texts[id]?.text);
    if (transformerRef.current) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.draw();
    }
  };

  useEffect(() => {
    if (editingText !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingText]);

  return (
    <div>
      <button
        onClick={() =>
          setTexts([
            ...texts,
            { text: '새로운 텍스트', color: 'black', fontFamily: 'Arial' },
          ])
        }>
        텍스트 추가
      </button>
      {selectedId !== null && (
        <div>
          <input
            ref={inputRef}
            value={editingText || ''}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => {
              if (selectedId !== null && editingText) {
                const updatedTexts = [...texts];
                updatedTexts[selectedId].text = editingText;
                setTexts(updatedTexts);
              }
              setEditingText(null);
            }}
          />
          <select
            value={texts[selectedId]?.color}
            onChange={(e) => {
              const updatedTexts = [...texts];
              updatedTexts[selectedId].color = e.target.value;
              setTexts(updatedTexts);
            }}>
            <option value='black'>Black</option>
            <option value='red'>Red</option>
            <option value='blue'>Blue</option>
          </select>
          <select
            value={texts[selectedId]?.fontFamily}
            onChange={(e) => {
              const updatedTexts = [...texts];
              updatedTexts[selectedId].fontFamily = e.target.value;
              setTexts(updatedTexts);
            }}>
            <option value='Arial'>Arial</option>
            <option value='Times New Roman'>Times New Roman</option>
            <option value='Verdana'>Verdana</option>
          </select>
        </div>
      )}
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          {texts.map((textObj, index) => (
            <Text
              key={index}
              text={textObj.text}
              x={50}
              y={50 + index * 30}
              fontSize={20}
              fill={textObj.color}
              fontFamily={textObj.fontFamily}
              draggable
              onClick={(e) => handleTextClick(index, e.target as Konva.Text)}
            />
          ))}
          <Transformer ref={transformerRef} />
        </Layer>
      </Stage>
    </div>
  );
};

export default Editor;
