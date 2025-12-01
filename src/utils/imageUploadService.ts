interface UploadImageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const uploadProductImage = async (
  productName: string,
  userId: string,
  imageFile: File
): Promise<UploadImageResponse> => {
  try {
    const formData = new FormData();
    formData.append('name', productName);
    formData.append('user_id', userId);
    formData.append('image', imageFile);

    const response = await fetch('https://web-production-b53d.up.railway.app/upload-product', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, message: result.message || 'Imagen subida exitosamente' };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al subir imagen' 
    };
  }
};

export const uploadProductImages = async (
  productName: string,
  userId: string,
  imageFiles: File[]
): Promise<UploadImageResponse> => {
  try {
    const results = await Promise.allSettled(
      imageFiles.map(file => uploadProductImage(productName, userId, file))
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    return {
      success: successful > 0,
      message: `${successful} imágenes subidas exitosamente${failed > 0 ? `, ${failed} fallaron` : ''}`
    };
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al subir imágenes' 
    };
  }
};
