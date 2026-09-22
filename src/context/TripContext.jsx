import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateTripPlan } from '../services/gemini';
import { useAuth } from './AuthContext';

const ACTIVE_TRIP_KEY_BASE = 'ai_trip_planner_active_trip';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const { user } = useAuth();
  const activeTripKey = user ? `${ACTIVE_TRIP_KEY_BASE}_${user.id}` : ACTIVE_TRIP_KEY_BASE;

  const [tripData, setTripData] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load saved trips from backend and active trip from localStorage
  useEffect(() => {
    const fetchTrips = async () => {
      if (!user?.id) {
        setSavedTrips([]);
        setTripData(null);
        return;
      }

      try {
        // Fetch from MySQL Backend
        const response = await fetch(`${API_BASE_URL}/api/trips/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (response.ok) {
          const trips = await response.json();
          setSavedTrips(trips);
        }
      } catch (e) {
        console.error("Failed to load trips from database", e);
      }

      // Active trip (the one currently being viewed/edited) stays in local storage for quick access
      try {
        const activeTrip = localStorage.getItem(activeTripKey);
        if (activeTrip) {
          setTripData(JSON.parse(activeTrip));
        } else {
          setTripData(null);
        }
      } catch (e) {
        console.error("Failed to load active trip", e);
      }
    };

    fetchTrips();
  }, [user?.id, activeTripKey]);

  const setActiveTripData = (data) => {
    setTripData(data);
    try {
      if (data) {
        localStorage.setItem(activeTripKey, JSON.stringify(data));
      } else {
        localStorage.removeItem(activeTripKey);
      }
    } catch (e) {
      console.error("Failed to save active trip", e);
    }
  };

  const handleGenerateTrip = async (formData) => {
    if (!user) {
      throw new Error("You must be logged in to save a trip.");
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await generateTripPlan(formData);
      plan.budget = formData.budget;
      
      setActiveTripData(plan);

      const newTripItem = {
        id: Date.now().toString(),
        userId: user.id,
        data: plan
      };

      // Save to MySQL Backend
      const response = await fetch(`${API_BASE_URL}/api/trips`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(newTripItem)
      });

      if (response.ok) {
        setSavedTrips(prev => [newTripItem, ...prev]);
      } else {
        throw new Error("Failed to save trip to database");
      }

      return plan;
    } catch (err) {
      setError(err.message || "Failed to generate trip plan. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedTrip = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.ok) {
        setSavedTrips(prev => prev.filter(t => t.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete trip from database", e);
    }
  };

  const clearAllSavedTrips = () => {
    // Optional: implement clear all on backend if needed, for now just individual delete is fine
    savedTrips.forEach(t => deleteSavedTrip(t.id));
  };

  const resetActiveTrip = () => {
    setActiveTripData(null);
  };

  const updateActiveTripPackingList = async (packingState) => {
    setTripData(prev => {
      if (!prev) return prev;
      const updatedTrip = {
        ...prev,
        packing_list_state: packingState
      };
      try {
        localStorage.setItem(activeTripKey, JSON.stringify(updatedTrip));
      } catch (e) {
        console.error("Failed to save active trip packing state", e);
      }

      // Update the saved trip in the backend
      const targetTrip = savedTrips.find(item => 
        item.data?.trip_details?.origin === updatedTrip.trip_details?.origin &&
        item.data?.trip_details?.destination === updatedTrip.trip_details?.destination &&
        item.data?.trip_details?.dates === updatedTrip.trip_details?.dates
      );

      if (targetTrip) {
        const newTargetTrip = { ...targetTrip, data: updatedTrip };
        // Delete old, save new (simple update for now)
        fetch(`${API_BASE_URL}/api/trips/${targetTrip.id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` }
        }).then(() => {
          fetch(`${API_BASE_URL}/api/trips`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(newTargetTrip)
          });
        });
        
        // Update local state
        setSavedTrips(prevSaved => prevSaved.map(item => item.id === targetTrip.id ? newTargetTrip : item));
      }

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
