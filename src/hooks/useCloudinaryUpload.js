import { useState } from 'react';
import { expensesApi } from '../api/client';

/**
 * Browser-direct Cloudinary upload hook.
 *
 * Flow:
 *  1. Calls GET /expenses/cloudinary-params on our server to receive a
 *     short-lived unsigned upload preset (cloudName, uploadPreset, folder).
 *  2. POSTs the file directly to Cloudinary's REST API as multipart/form-data —
 *     no Cloudinary SDK required in the browser.
 *  3. Returns the secure_url from Cloudinary's JSON response to the caller.
 *
 * Usage:
 *   const { upload, uploading, uploadError, reset } = useCloudinaryUpload();
 *   const url = await upload(fileObject);
 */
export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Reset error state — useful when re-opening an upload form
  const reset = () => setUploadError(null);

  const upload = async (file) => {
    setUploading(true);
    setUploadError(null);

    try {
      // Step 1: Fetch upload params from our server (keeps credentials off the client)
      const paramsRes = await expensesApi.getCloudinaryParams();
      const { cloudName, uploadPreset, folder } = paramsRes.data.data;

      // Step 2: Build multipart form and POST directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!cloudRes.ok) {
        // Cloudinary returns JSON error bodies even for 4xx/5xx
        const errBody = await cloudRes.json().catch(() => ({}));
        throw new Error(errBody.error?.message ?? 'Upload failed');
      }

      const data = await cloudRes.json();
      // secure_url is the HTTPS CDN URL for the uploaded asset
      return data.secure_url;
    } catch (err) {
      const message = err.message ?? 'Upload failed';
      setUploadError(message);
      // Re-throw so the caller can handle it (e.g. show a toast)
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, uploadError, reset };
}

export default useCloudinaryUpload;
