import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tiffUrl = searchParams.get('url');
    const width = searchParams.get('width') ? parseInt(searchParams.get('width')!) : 800;
    const height = searchParams.get('height') ? parseInt(searchParams.get('height')!) : 600;
    const format = searchParams.get('format') || 'jpeg';
    const quality = searchParams.get('quality') ? parseInt(searchParams.get('quality')!) : 80;

    if (!tiffUrl) {
      return NextResponse.json({ error: 'Missing TIFF URL' }, { status: 400 });
    }

    try {
      console.log(`Processing TIFF: ${tiffUrl}`);
      
      // For large Sentinel-2 COG files, we need a different approach
      // These files are too large to process in memory, so we'll create a smaller preview
      let buffer: Buffer;
      let strategy = 'thumbnail';
      
      try {
        // Strategy: Download the full file but with extended timeout for large files
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for large files
        
        console.log('Attempting to download complete TIFF file...');
        const response = await fetch(tiffUrl, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch TIFF: ${response.status} ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const fileSize = contentLength ? parseInt(contentLength) : 0;
        console.log(`TIFF file size: ${fileSize} bytes (${Math.round(fileSize / 1024 / 1024)}MB)`);
        
        // Read the complete file
        const imageBuffer = await response.arrayBuffer();
        buffer = Buffer.from(imageBuffer);
        console.log(`Downloaded complete file: ${buffer.length} bytes`);
        
      } catch (downloadError: any) {
        console.error(`Download failed: ${downloadError.message}`);
        throw new Error(`Unable to download TIFF file: ${downloadError.message}`);
      }

      // Process with Sharp using memory-efficient settings
      console.log('Processing with Sharp...');
      let sharpImage = sharp(buffer, {
        limitInputPixels: false,    // Allow large images
        sequentialRead: true,       // More memory efficient
        density: 72,                // Lower DPI for web display
      });
      
      // Get image metadata first
      const metadata = await sharpImage.metadata();
      console.log(`Image metadata:`, {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        density: metadata.density
      });

      // For Sentinel-2 images, extract a region of interest rather than the full image
      // This is much more memory efficient
      const originalWidth = metadata.width || 0;
      const originalHeight = metadata.height || 0;
      
      if (originalWidth > 2000 || originalHeight > 2000) {
        console.log('Large satellite image detected, extracting center region...');
        
        // Extract center region (25% of original size) for processing
        const extractWidth = Math.floor(originalWidth * 0.25);
        const extractHeight = Math.floor(originalHeight * 0.25);
        const left = Math.floor((originalWidth - extractWidth) / 2);
        const top = Math.floor((originalHeight - extractHeight) / 2);
        
        sharpImage = sharpImage.extract({
          left: left,
          top: top,
          width: extractWidth,
          height: extractHeight
        });
        
        console.log(`Extracted region: ${extractWidth}x${extractHeight} from center`);
      }

      // Resize to target dimensions
      sharpImage = sharpImage.resize(width, height, {
        fit: 'cover',
        position: 'center'
      });

      let outputBuffer: Buffer;
      let mimeType: string;

      // Use simpler processing options to avoid memory issues
      switch (format.toLowerCase()) {
        case 'png':
          outputBuffer = await sharpImage.png({ 
            compressionLevel: 6,
            quality: 80
          }).toBuffer();
          mimeType = 'image/png';
          break;
        case 'webp':
          outputBuffer = await sharpImage.webp({ 
            quality: quality,
            effort: 3
          }).toBuffer();
          mimeType = 'image/webp';
          break;
        case 'jpeg':
        default:
          outputBuffer = await sharpImage.jpeg({ 
            quality: quality,
            progressive: false  // Disable progressive for stability
          }).toBuffer();
          mimeType = 'image/jpeg';
          break;
      }

      console.log(`Successfully processed: ${outputBuffer.length} bytes as ${format}`);

      // Convert to base64 data URL
      const base64 = outputBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;

      return NextResponse.json({
        success: true,
        dataUrl,
        originalUrl: tiffUrl,
        processedFormat: format,
        dimensions: { width, height },
        originalDimensions: { 
          width: metadata.width, 
          height: metadata.height 
        },
        fileSize: outputBuffer.length,
        originalFileSize: buffer.length,
        processingStrategy: strategy,
        message: 'Satellite image successfully processed (center region extracted)'
      });
      
    } catch (fetchError: any) {
      console.error('TIFF processing error:', fetchError);
      
      // Return error placeholder for failed processing
      const errorPlaceholder = generateErrorPlaceholder(width, height, format, fetchError.message);
      
      return NextResponse.json({
        success: false,
        dataUrl: errorPlaceholder,
        error: fetchError.message || 'TIFF processing failed',
        originalUrl: tiffUrl,
        suggestion: 'TIFF file may be too large, corrupted, or inaccessible'
      });
    }

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing TIFF' },
      { status: 500 }
    );
  }
}

function generateErrorPlaceholder(width: number, height: number, format: string, errorMessage: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#f9fafb"/>
      <rect x="0" y="0" width="100%" height="100%" fill="url(data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M0 0h40v40H0z'/%3E%3C/g%3E%3C/svg%3E)"/>
      <circle cx="50%" cy="35%" r="30" fill="#ef4444" opacity="0.1"/>
      <text x="50%" y="35%" text-anchor="middle" fill="#dc2626" font-size="24" font-family="sans-serif">⚠️</text>
      <text x="50%" y="45%" text-anchor="middle" fill="#6b7280" font-size="14" font-family="sans-serif">
        TIFF Processing Failed
      </text>
      <text x="50%" y="55%" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="sans-serif">
        ${errorMessage.length > 50 ? errorMessage.substring(0, 50) + '...' : errorMessage}
      </text>
      <text x="50%" y="65%" text-anchor="middle" fill="#d1d5db" font-size="9" font-family="sans-serif">
        ${width}x${height} • ${format.toUpperCase()}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
} 