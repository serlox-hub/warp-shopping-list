import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: Deno.env.get('MINIO_ENDPOINT'),
  credentials: {
    accessKeyId: Deno.env.get('MINIO_ACCESS_KEY')!,
    secretAccessKey: Deno.env.get('MINIO_SECRET_KEY')!,
  },
  forcePathStyle: true,
})

const BUCKET = 'shopping-images'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      return new Response(
        JSON.stringify({ error: 'filename and contentType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de archivo no permitido. Solo JPEG, PNG y WebP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `${user.id}/${timestamp}-${sanitizedFilename}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 })

    return new Response(
      JSON.stringify({ uploadUrl, key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
