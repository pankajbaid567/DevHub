import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MousePointer, 
  Square, 
  Circle, 
  Type, 
  Image, 
  Eraser,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Grid,
  Download,
  Save,
  Users,
  MessageCircle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Palette,
  Move,
  Copy,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CollabBoardCanvasProps {
  boardId: string;
  boardData: any[];
  collaborators: any[];
  onBoardUpdate: (data: any[]) => void;
  onSave: () => void;
  onToggleChat?: () => void;
  className?: string;
}

interface DrawingAction {
  id: string;
  type: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  points?: { x: number; y: number }[];
  userId: string;
  timestamp: number;
}

const CollabBoardCanvas: React.FC<CollabBoardCanvasProps> = ({
  boardId,
  boardData = [],
  collaborators = [],
  onBoardUpdate,
  onSave,
  onToggleChat,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [undoStack, setUndoStack] = useState<DrawingAction[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingAction[][]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{x: number, y: number} | null>(null);
  const { toast } = useToast();

  const tools = [
    { id: 'select', name: 'Select', icon: MousePointer, shortcut: 'V' },
    { id: 'pen', name: 'Pen', icon: Square, shortcut: 'P' },
    { id: 'rectangle', name: 'Rectangle', icon: Square, shortcut: 'R' },
    { id: 'circle', name: 'Circle', icon: Circle, shortcut: 'C' },
    { id: 'text', name: 'Text', icon: Type, shortcut: 'T' },
    { id: 'image', name: 'Image', icon: Image, shortcut: 'I' },
    { id: 'eraser', name: 'Eraser', icon: Eraser, shortcut: 'E' }
  ];

  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ];

  const strokeWidths = [1, 2, 4, 6, 8, 12, 16, 20];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1920;
    canvas.height = 1080;

    // Set default styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw existing board data
    drawBoardData();
  }, [boardData]);

  const drawBoardData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if visible
    if (isGridVisible) {
      drawGrid(ctx);
    }

    // Draw all board data
    if (Array.isArray(boardData)) {
      boardData.forEach(action => {
        drawAction(ctx, action);
      });
    }
  }, [boardData, isGridVisible]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 20;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  };

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawingAction) => {
    if (!action || typeof action !== 'object') return;
    
    ctx.strokeStyle = action.color || '#000000';
    ctx.lineWidth = action.strokeWidth || 2;

    switch (action.type) {
      case 'pen':
        if (action.points && action.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          for (let i = 1; i < action.points.length; i++) {
            ctx.lineTo(action.points[i].x, action.points[i].y);
          }
          ctx.stroke();
        }
        break;
      case 'rectangle':
        ctx.strokeRect(
          Math.min(action.startX, action.endX),
          Math.min(action.startY, action.endY),
          Math.abs(action.endX - action.startX),
          Math.abs(action.endY - action.startY)
        );
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(action.endX - action.startX, 2) + 
          Math.pow(action.endY - action.startY, 2)
        ) / 2;
        ctx.beginPath();
        ctx.arc(
          (action.startX + action.endX) / 2,
          (action.startY + action.endY) / 2,
          radius,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        break;
      case 'text':
        ctx.font = `${action.strokeWidth * 10}px Arial`;
        ctx.fillStyle = action.color;
        ctx.fillText(action.text || 'Text', action.startX, action.startY);
        break;
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure boardData is an array
    if (!Array.isArray(boardData)) {
      console.warn('boardData is not an array, initializing as empty array');
      onBoardUpdate([]);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Handle text tool differently
    if (tool === 'text') {
      setTextPosition({ x, y });
      setTextInput('');
      setEditingText('new');
      return;
    }

    // Handle eraser tool
    if (tool === 'eraser') {
      handleEraser(x, y);
      return;
    }

    setIsDrawing(true);

    const newAction: DrawingAction = {
      id: Date.now().toString(),
      type: tool,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      color,
      strokeWidth,
      userId: 'current-user', // This should come from auth context
      timestamp: Date.now()
    };

    if (tool === 'pen') {
      newAction.points = [{ x, y }];
    }

    // Add to undo stack
    setUndoStack(prev => [...prev, [...boardData]]);
    setRedoStack([]);

    onBoardUpdate([...boardData, newAction]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const newData = [...boardData];
    const currentAction = newData[newData.length - 1];

    if (tool === 'pen' && currentAction.points) {
      currentAction.points.push({ x, y });
    } else {
      currentAction.endX = x;
      currentAction.endY = y;
    }

    onBoardUpdate(newData);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onSave();
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, [...boardData]]);
    setUndoStack(prev => prev.slice(0, -1));
    onBoardUpdate(previousState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, [...boardData]]);
    setRedoStack(prev => prev.slice(0, -1));
    onBoardUpdate(nextState);
  };

  const clearBoard = () => {
    if (window.confirm('Are you sure you want to clear the entire board?')) {
      setUndoStack(prev => [...prev, [...boardData]]);
      setRedoStack([]);
      onBoardUpdate([]);
    }
  };

  const exportBoard = (format: string = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (format === 'png' || format === 'jpg') {
      const dataURL = canvas.toDataURL(`image/${format}`);
      const link = document.createElement('a');
      link.download = `board-${Date.now()}.${format}`;
      link.href = dataURL;
      link.click();
    }
  };

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') {
      setZoom(prev => Math.min(prev * 1.1, 3));
    } else if (direction === 'out') {
      setZoom(prev => Math.max(prev * 0.9, 0.1));
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleEraser = (x: number, y: number) => {
    const newData = boardData.filter(action => {
      if (action.type === 'pen' && action.points) {
        // Check if any point is within eraser radius
        const eraserRadius = strokeWidth * 2;
        return !action.points.some(point => 
          Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)) < eraserRadius
        );
      } else {
        // For shapes, check if the click is within the shape bounds
        const minX = Math.min(action.startX, action.endX);
        const maxX = Math.max(action.startX, action.endX);
        const minY = Math.min(action.startY, action.endY);
        const maxY = Math.max(action.startY, action.endY);
        
        return !(x >= minX && x <= maxX && y >= minY && y <= maxY);
      }
    });
    
    onBoardUpdate(newData);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPosition) return;

    const newAction: DrawingAction = {
      id: Date.now().toString(),
      type: 'text',
      startX: textPosition.x,
      startY: textPosition.y,
      endX: textPosition.x,
      endY: textPosition.y,
      color,
      strokeWidth,
      text: textInput,
      userId: 'current-user',
      timestamp: Date.now()
    };

    onBoardUpdate([...boardData, newAction]);
    setEditingText(null);
    setTextInput('');
    setTextPosition(null);
  };

  const handleTextEdit = (actionId: string) => {
    const action = boardData.find(a => a.id === actionId);
    if (action && action.text) {
      setEditingText(actionId);
      setTextInput(action.text);
      setTextPosition({ x: action.startX, y: action.startY });
    }
  };

  const handleTextUpdate = () => {
    if (!editingText || !textInput.trim()) return;

    const newData = boardData.map(action => {
      if (action.id === editingText) {
        return { ...action, text: textInput };
      }
      return action;
    });

    onBoardUpdate(newData);
    setEditingText(null);
    setTextInput('');
    setTextPosition(null);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Top Toolbar */}
      <div className="bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-foreground">Collaborative Board</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* Show collaborators */}}
              >
                <Users className="w-4 h-4 mr-2" />
                {collaborators.length + 1}
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportBoard('png')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {onToggleChat && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleChat}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left Toolbar */}
        <div className="w-16 bg-background border-r border-border p-2 space-y-2">
          {tools.map((toolItem) => {
            const Icon = toolItem.icon;
            return (
              <Button
                key={toolItem.id}
                variant={tool === toolItem.id ? 'default' : 'ghost'}
                size="sm"
                className="w-12 h-12 p-0"
                onClick={() => setTool(toolItem.id)}
                title={`${toolItem.name} (${toolItem.shortcut})`}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}

          <div className="border-t border-border pt-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0"
              onClick={redo}
              disabled={redoStack.length === 0}
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-muted/20">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair"
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onClick={(e) => {
              if (tool === 'select') {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                const x = (e.clientX - rect.left - pan.x) / zoom;
                const y = (e.clientY - rect.top - pan.y) / zoom;
                
                // Check if clicking on text to edit
                const clickedAction = boardData.find(action => {
                  if (action.type === 'text') {
                    const textWidth = (action.text || 'Text').length * (action.strokeWidth * 6);
                    const textHeight = action.strokeWidth * 12;
                    return x >= action.startX && x <= action.startX + textWidth &&
                           y >= action.startY - textHeight && y <= action.startY;
                  }
                  return false;
                });
                
                if (clickedAction) {
                  handleTextEdit(clickedAction.id);
                }
              }
            }}
          />

          {/* Text Input Overlay */}
          {editingText && textPosition && (
            <div
              className="absolute z-20"
              style={{
                left: textPosition.x * zoom + pan.x,
                top: textPosition.y * zoom + pan.y,
                transform: `scale(${zoom})`
              }}
            >
              <div className="bg-background border border-border rounded p-2 shadow-lg">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editingText === 'new') {
                        handleTextSubmit();
                      } else {
                        handleTextUpdate();
                      }
                    } else if (e.key === 'Escape') {
                      setEditingText(null);
                      setTextInput('');
                      setTextPosition(null);
                    }
                  }}
                  onBlur={() => {
                    if (editingText === 'new') {
                      handleTextSubmit();
                    } else {
                      handleTextUpdate();
                    }
                  }}
                  className="bg-transparent border-none outline-none text-foreground"
                  style={{ fontSize: `${strokeWidth * 10}px`, color: color }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Collaborator Cursors */}
          {collaborators.map(collaborator => (
            <div
              key={collaborator.id}
              className="absolute pointer-events-none z-10"
              style={{
                left: (collaborator.cursorX || 0) * zoom + pan.x,
                top: (collaborator.cursorY || 0) * zoom + pan.y,
                transform: `scale(${zoom})`
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary rounded-full border-2 border-background shadow-lg" />
                <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs whitespace-nowrap">
                  {collaborator.username}
                </div>
              </div>
            </div>
          ))}

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            {/* Color and Stroke Controls */}
            <Card className="p-2">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {colors.map(colorOption => (
                    <button
                      key={colorOption}
                      onClick={() => setColor(colorOption)}
                      className={`w-6 h-6 rounded border-2 ${
                        color === colorOption ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: colorOption }}
                    />
                  ))}
                </div>
                
                <div className="border-l border-border pl-2">
                  <select
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="text-sm bg-transparent border-none outline-none"
                  >
                    {strokeWidths.map(width => (
                      <option key={width} value={width}>{width}px</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Zoom Controls */}
            <Card className="p-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleZoom('out')}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleZoom('in')}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleZoom('reset')}
                >
                  Reset
                </Button>
              </div>
            </Card>

            {/* Action Buttons */}
            <Card className="p-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant={isGridVisible ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setIsGridVisible(!isGridVisible)}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportBoard('png')}
                >
                  <Download className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearBoard}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollabBoardCanvas;
