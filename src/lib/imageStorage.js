import { supabase } from './supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const COMPRESS_MAX_WIDTH = 800
const COMPRESS_QUALITY = 0.7

// In-memory cache for presigned URLs (key -> { url, expiresAt })
const urlCache = new Map()
const CACHE_TTL_MS = 50 * 60 * 1000 // 50 minutes (URLs valid for 60)

/**
 * Comprime una imagen redimensionándola y convirtiéndola a WebP.
 * @param {File} file - Archivo de imagen original
 * @returns {Promise<Blob>} Imagen comprimida como Blob
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > COMPRESS_MAX_WIDTH) {
        height = Math.round((height * COMPRESS_MAX_WIDTH) / width)
        width = COMPRESS_MAX_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to compress image')),
        'image/webp',
        COMPRESS_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

/**
 * Sube una imagen a MinIO a través de Edge Function.
 * La imagen se comprime a WebP antes de subir.
 * @param {File} file - Archivo de imagen a subir
 * @param {function} [onProgress] - Callback con el porcentaje de progreso (0-100)
 * @returns {Promise<string>} Key de la imagen subida
 */
export async function uploadImage(file, onProgress) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid image type. Only JPEG, PNG and WebP are allowed.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image exceeds 5MB limit')
  }

  const compressed = await compressImage(file)

  const { data, error } = await supabase.functions.invoke('image-upload', {
    body: {
      filename: file.name.replace(/\.[^.]+$/, '.webp'),
      contentType: 'image/webp',
    },
  })

  if (error) {
    throw new Error('Failed to get upload URL')
  }

  const { uploadUrl, key } = data

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(key)
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', 'image/webp')
    xhr.send(compressed)
  })
}

/**
 * Obtiene URL firmada para ver una imagen (con caché en memoria).
 * @param {string} key - Key de la imagen en MinIO
 * @returns {Promise<string|null>} URL firmada (válida por 1 hora)
 */
export async function getImageUrl(key) {
  if (!key) return null

  const cached = urlCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url
  }

  const { data, error } = await supabase.functions.invoke('image-url', {
    body: { key },
  })

  if (error) {
    throw new Error('Failed to get image URL')
  }

  urlCache.set(key, { url: data.url, expiresAt: Date.now() + CACHE_TTL_MS })
  return data.url
}
