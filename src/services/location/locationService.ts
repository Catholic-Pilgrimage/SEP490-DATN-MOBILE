import * as Location from 'expo-location';

// Location services
// Get current location, check-in, distance calculation, etc.

/**
 * Get current user location
 * @returns Promise with latitude and longitude
 */
export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  try {
    // Request permission first
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Location permission denied. Please enable location access in your device settings.');
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 10,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error: any) {
    if (error.message.includes('permission')) {
      throw error; // Re-throw permission errors as-is
    }
    throw new Error(`Unable to get location: ${error.message || 'Please ensure location services are enabled'}`);
  }
};

const locationService = {
  getCurrentLocation,
};

export default locationService;
