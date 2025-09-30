import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MobileTruckProps {
  onRegistered?: (truckData: any) => void
}

export function MobileTruckRegistration({ onRegistered }: MobileTruckProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [truckData, setTruckData] = useState<any>(null)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [battery, setBattery] = useState<number | null>(null)
  const [charging, setCharging] = useState<boolean | null>(null)

  // Get current location
  const getCurrentLocation = (): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => reject(error),
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 60000 
        }
      )
    })
  }

  // Register device as truck
  const registerDevice = async () => {
    try {
      setError(null)
      const currentLocation = await getCurrentLocation()
      setLocation(currentLocation)

      // Try to get battery info (supported in some browsers)
      try {
        const navAny = navigator as any
        if (navAny.getBattery) {
          const batteryObj = await navAny.getBattery()
          const levelPct = Math.round((batteryObj.level ?? 0) * 100)
          setBattery(levelPct)
          setCharging(!!batteryObj.charging)
          // Listen for changes while component mounted
          const levelHandler = () => setBattery(Math.round((batteryObj.level ?? 0) * 100))
          const chargingHandler = () => setCharging(!!batteryObj.charging)
          batteryObj.addEventListener('levelchange', levelHandler)
          batteryObj.addEventListener('chargingchange', chargingHandler)
          // Store to remove on unmount
          ;(window as any).__batteryListeners = { batteryObj, levelHandler, chargingHandler }
        }
      } catch (e) {
        // battery API not available; ignore gracefully
      }

      const response = await fetch('/api/device-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'register_device',
          location: currentLocation,
          router_id: 'ROUTER_MOBILE',
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setIsRegistered(true)
        const registeredTruck = { ...result.truck_data, battery_level: battery ?? undefined }
        setTruckData(registeredTruck)
        // Pass the truck object directly
        onRegistered?.(registeredTruck)
        
        // Start location tracking automatically
        if (registeredTruck?.truck_id) {
          startLocationTracking(registeredTruck.truck_id)
        } else {
          setError('Registration succeeded but truck_id is missing in response')
        }
      } else {
        setError(result.error || 'Registration failed')
      }
    } catch (err) {
      let message = 'Unknown error'
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) message = 'Location permission denied. Please allow location access.'
        else if (err.code === err.POSITION_UNAVAILABLE) message = 'Location unavailable. Try moving to an open area.'
        else if (err.code === err.TIMEOUT) message = 'Location request timed out. Please try again.'
      } else if (err instanceof Error) {
        message = err.message
      }
      setError(message)
    }
  }

  // Start real-time location tracking
  const startLocationTracking = (truckId: string) => {
    setIsTracking(true)
    
    const updateInterval = setInterval(async () => {
      try {
        const currentLocation = await getCurrentLocation()
        setLocation(currentLocation)

        // Update location on server
        await fetch('/api/device-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_location',
            truck_id: truckId,
            lat: currentLocation.lat,
            lon: currentLocation.lon
          })
        })

        // Also start tracking via WebSocket API
        await fetch('/api/truck-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'start_tracking',
            truck_id: truckId
          })
        })

      } catch (err) {
        console.error('Location update failed:', err)
      }
    }, 2000) // Update every 2 seconds

    // Store interval ID for cleanup
    ;(window as any).trackingInterval = updateInterval
  }

  // Stop tracking
  const stopTracking = () => {
    setIsTracking(false)
    if ((window as any).trackingInterval) {
      clearInterval((window as any).trackingInterval)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as any).trackingInterval) {
        clearInterval((window as any).trackingInterval)
      }
      const listeners = (window as any).__batteryListeners
      if (listeners?.batteryObj) {
        listeners.batteryObj.removeEventListener('levelchange', listeners.levelHandler)
        listeners.batteryObj.removeEventListener('chargingchange', listeners.chargingHandler)
      }
    }
  }, [])

  return (
    <Card className="p-4 m-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">📱 Mobile Truck Mode</h3>
          <Badge variant={isRegistered ? "default" : "secondary"}>
            {isRegistered ? "Registered" : "Not Registered"}
          </Badge>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Error: {error}
          </div>
        )}

        {!isRegistered ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Register your phone as a truck to enable live tracking on the dashboard.
            </p>
            <Button onClick={registerDevice} className="w-full">
              🚛 Register as Truck
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm space-y-1">
              <div><strong>Truck ID:</strong> {truckData?.truck_id}</div>
              <div><strong>Network:</strong> {truckData?.network_info.router_id}</div>
              {location && (
                <>
                  <div><strong>Latitude:</strong> {location.lat.toFixed(6)}</div>
                  <div><strong>Longitude:</strong> {location.lon.toFixed(6)}</div>
                </>
              )}
              {battery !== null && (
                <div><strong>Battery:</strong> {battery}% {charging ? '(Charging)' : ''}</div>
              )}
              <div className="flex items-center gap-2">
                <strong>Tracking:</strong>
                <Badge variant={isTracking ? "default" : "secondary"}>
                  {isTracking ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              {!isTracking ? (
                <Button 
                  onClick={() => truckData?.truck_id ? startLocationTracking(truckData.truck_id) : setError('Missing truck_id')} 
                  className="flex-1"
                >
                  ▶️ Start Tracking
                </Button>
              ) : (
                <Button 
                  onClick={stopTracking} 
                  variant="destructive" 
                  className="flex-1"
                >
                  ⏹️ Stop Tracking
                </Button>
              )}
            </div>

            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              ✅ Your phone is now trackable on the dashboard!<br />
              📍 Location updates every 2 seconds when tracking is active.
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}