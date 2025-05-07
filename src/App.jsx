import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'

function App() {
  const webcamRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [flashFrame, setFlashFrame] = useState(false)
  const [cardLibrary, setCardLibrary] = useState([])
  const [toast, setToast] = useState(null)
  const dingSound = useRef(new Audio('/ding.wav'))

  // Card frame dimensions (standard MTG card is 63mm x 88mm, using 2.5:3.5 ratio)
  const frameWidth = 250
  const frameHeight = 350

  const captureFrame = useCallback(async () => {
    if (!webcamRef.current) return

    const canvas = webcamRef.current.getCanvas()
    if (!canvas) return

    try {
      const base64String = canvas.toDataURL('image/jpeg').split(',')[1]
      
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
      
      if (data.name) {
        // Play sound
        dingSound.current.play()
        
        // Flash frame
        setFlashFrame(true)
        setTimeout(() => setFlashFrame(false), 500)
        
        // Show toast
        setToast(data.name)
        setTimeout(() => setToast(null), 3000)
        
        // Update library
        setCardLibrary(prevLibrary => {
          const existingCard = prevLibrary.find(card => card.name === data.name)
          if (existingCard) {
            return prevLibrary.map(card =>
              card.name === data.name
                ? { ...card, quantity: card.quantity + 1 }
                : card
            )
          }
          return [...prevLibrary, { 
            name: data.name, 
            quantity: 1, 
            id: `${data.name}-${Date.now()}` 
          }]
        })
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing the image')
    }
  }, [])

  useEffect(() => {
    let interval
    if (isScanning) {
      interval = setInterval(captureFrame, 2500)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isScanning, captureFrame])

  const updateQuantity = (id, delta) => {
    setCardLibrary(prevLibrary =>
      prevLibrary.map(card => {
        if (card.id === id) {
          const newQuantity = Math.max(0, card.quantity + delta)
          return { ...card, quantity: newQuantity }
        }
        return card
      }).filter(card => card.quantity > 0)
    )
  }

  const removeCard = (id) => {
    setCardLibrary(prevLibrary => prevLibrary.filter(card => card.id !== id))
  }

  const exportToCSV = () => {
    const headers = ['Card Name', 'Card ID', 'Quantity']
    const csvContent = [
      headers.join(','),
      ...cardLibrary.map(card => [
        `"${card.name}"`,
        `"${card.id}"`,
        card.quantity
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mtg-library-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MTG Card Scanner</h1>
          <p className="text-gray-600">Position a Magic: The Gathering card within the frame</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              className="w-full rounded-lg"
              screenshotFormat="image/jpeg"
            />
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 
                ${flashFrame ? 'border-green-500 bg-green-500/20' : 'border-green-400'}
                transition-colors duration-500`}
              style={{
                width: frameWidth,
                height: frameHeight,
              }}
            />
          </div>

          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`px-6 py-3 rounded-md text-white font-medium
                ${isScanning 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {isScanning ? 'Stop Scanning' : 'Start Scanning'}
            </button>
            {cardLibrary.length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-6 py-3 rounded-md text-white font-medium bg-green-500 hover:bg-green-600"
              >
                Export to CSV
              </button>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {toast && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg animate-fade-in">
              {toast} added to library
            </div>
          )}

          {cardLibrary.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Card Library</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Card Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cardLibrary.map((card) => (
                      <tr key={card.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {card.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(card.id, -1)}
                              className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{card.quantity}</span>
                            <button
                              onClick={() => updateQuantity(card.id, 1)}
                              className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => removeCard(card.id)}
                            className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md p-1"
                            aria-label="Remove card"
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
