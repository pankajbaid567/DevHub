import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptedTypes = ['.pdf', '.doc', '.docx'],
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Please upload: ${acceptedTypes.join(', ')}`;
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return `File too large. Maximum size allowed is ${maxSizeMB}MB`;
    }

    // Check if it's actually a file
    if (file.size === 0) {
      return 'File appears to be empty';
    }

    return null;
  }, [acceptedTypes, maxSize]);

  const handleFileSelect = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadStatus('error');
      toast({
        title: "File validation failed",
        description: error,
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 20;
      });
    }, 100);

    try {
      // Call the parent callback
      await onFileSelect(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} is ready for analysis`
      });
    } catch (error) {
      clearInterval(progressInterval);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });
    }
  }, [validateFile, onFileSelect, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Upload className="w-5 h-5 animate-pulse text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="w-full">
      <Card 
        className={`
          transition-all duration-300 
          ${isDragOver ? 'border-primary border-2 bg-primary/5' : 'border-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${uploadStatus === 'error' ? 'border-red-500' : ''}
          ${uploadStatus === 'success' ? 'border-green-500' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!disabled && uploadStatus === 'idle' ? handleBrowseClick : undefined}
      >
        <CardContent className="p-8">
          {selectedFile ? (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon()}
                  <div>
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                
                {uploadStatus !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              {uploadStatus === 'uploading' && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}

              {/* Success Message */}
              {uploadStatus === 'success' && (
                <div className="text-center text-green-600">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">File uploaded successfully!</p>
                  <p className="text-sm text-muted-foreground">Ready for analysis</p>
                </div>
              )}

              {/* Error Message */}
              {uploadStatus === 'error' && (
                <div className="text-center text-red-600">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">Upload failed</p>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemoveFile}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Upload Prompt */
            <div className="text-center space-y-4">
              <div className={`
                w-16 h-16 mx-auto rounded-full flex items-center justify-center
                ${isDragOver ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
                transition-colors duration-300
              `}>
                <Upload className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {isDragOver ? 'Drop your resume here' : 'Upload your resume'}
                </h3>
                <p className="text-muted-foreground">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supported formats: {acceptedTypes.join(', ')} • Max {(maxSize / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
              
              <Button 
                variant="outline" 
                disabled={disabled}
                className="mt-4"
              >
                <File className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default FileUpload;
