import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateTripPlan } from '../services/gemini';

const SAVED_TRIPS_KEY = 'ai_trip_planner_saved_trips';
const ACTIVE_TRIP_KEY = 'ai_trip_planner_active_trip';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const [tripData, setTripData] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load saved trips and active trip from localStorage
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(SAVED_TRIPS_KEY);
      if (storedHistory) {
        setSavedTrips(JSON.parse(storedHistory));
      }

      const activeTrip = localStorage.getItem(ACTIVE_TRIP_KEY);
      if (activeTrip) {
        setTripData(JSON.parse(activeTrip));
      }
    } catch (e) {
      console.error("Failed to load trips from storage", e);
    }
  }, []);

  const saveTripsToStorage = (trips) => {
    setSavedTrips(trips);
    try {
      localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(trips));
    } catch (e) {
      console.error("Failed to save trips to storage", e);
    }
  };

  const setActiveTripData = (data) => {
    setTripData(data);
    try {
      if (data) {
        localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(ACTIVE_TRIP_KEY);
      }
    } catch (e) {
      console.error("Failed to save active trip", e);
    }
  };

  const handleGenerateTrip = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const plan = await generateTripPlan(formData);
      plan.budget = formData.budget;
      
      setActiveTripData(plan);

      const newTripItem = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        data: plan
      };

      const updatedHistory = [newTripItem, ...savedTrips];
      saveTripsToStorage(updatedHistory);

      return plan;
    } catch (err) {
      setError(err.message || "Failed to generate trip plan. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedTrip = (id) => {
    const updated = savedTrips.filter(t => t.id !== id);
    saveTripsToStorage(updated);
  };

  const clearAllSavedTrips = () => {
    saveTripsToStorage([]);
  };

  const resetActiveTrip = () => {
    setActiveTripData(null);
  };

  const updateActiveTripPackingList = (packingState) => {
    setTripData(prev => {
      if (!prev) return prev;
      const updatedTrip = {
        ...prev,
        packing_list_state: packingState
      };
      try {
        localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(updatedTrip));
      } catch (e) {
        console.error("Failed to save active trip packing state", e);
      }

      setSavedTrips(prevSaved => {
        const updatedSaved = prevSaved.map(item => {
          if (
            item.data &&
            item.data.trip_details?.origin === updatedTrip.trip_details?.origin &&
            item.data.trip_details?.destination === updatedTrip.trip_details?.destination &&
            item.data.trip_details?.dates === updatedTrip.trip_details?.dates
          ) {
            return { ...item, data: updatedTrip };
          }
          return item;
        });
        try {
          localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(updatedSaved));
        } catch (e) {
          console.error("Failed to save updated trips to storage", e);
        }
        return updatedSaved;
      });

      return updatedTrip;
    });
  };

  return (
    <TripContext.Provider
      value={{
        tripData,
        savedTrips,
        loading,
        error,
        handleGenerateTrip,
        setActiveTripData,
        updateActiveTripPackingList,
        deleteSavedTrip,
        clearAllSavedTrips,
        resetActiveTrip
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTripContext = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTripContext must be used within a TripProvider');
  }
  return context;
};
