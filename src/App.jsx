import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

function App() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      setImage(file)
      setError(null)
      setResult(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1
  })

  const handleSubmit = async () => {
    if (!image) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const reader = new FileReader()
      reader.readAsDataURL(image)
      
      reader.onload = async () => {
        const base64String = reader.result.split(',')[1]
        
        const response = await fetch('https://mtg-embed-api.onrender.com/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64String })
        })

        if (!response.ok) {
          throw new Error('Failed to process image')
        }

        const data = await response.json()
        setResult(data)
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing the image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MTG Card Scanner</h1>
          <p className="text-gray-600">Upload an image of a Magic: The Gathering card to identify it</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSubmit()
                  }}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Identify Card'}
                </button>
              </div>
            ) : (
              <div className="text-gray-600">
                <p className="text-lg mb-2">
                  {isDragActive ? 'Drop the image here' : 'Drag and drop an image here, or click to select'}
                </p>
                <p className="text-sm">Supports JPG, JPEG, and PNG</p>
              </div>
            )}
          </div>

          {loading && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Processing your card...</p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-50 rounded-md">
              <h3 className="text-lg font-semibold text-gray-900">Card Identified!</h3>
              <p className="mt-2 text-gray-700">Name: {result.name}</p>
              <p className="text-gray-700">Similarity Score: {(result.similarity * 100).toFixed(2)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
