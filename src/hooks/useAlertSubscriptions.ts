import { useState, useEffect, useCallback } from 'react';
import { AlertSubscription, api } from '../lib/api';

interface UseAlertSubscriptionsResult {
  subscriptions: AlertSubscription[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  subscribing: boolean;
  unsubscribing: string | null; // email being unsubscribed
  subscribe: (email: string) => Promise<void>;
  unsubscribe: (email: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useAlertSubscriptions(): UseAlertSubscriptionsResult {
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await api.getAlertSubscriptions();
      setSubscriptions(response.subscriptions);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError('Failed to load alert subscriptions');
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      await fetchSubscriptions();
    } finally {
      setLoading(false);
    }
  }, [fetchSubscriptions]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSubscriptions();
    } finally {
      setRefreshing(false);
    }
  }, [fetchSubscriptions]);

  const subscribe = useCallback(async (email: string) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    // Check if email already exists
    if (subscriptions.some(sub => sub.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('This email is already subscribed');
    }

    setSubscribing(true);
    setError(null);

    try {
      const response = await api.subscribeToAlerts(email);
      
      // Add the new subscription to the list optimistically
      const newSubscription: AlertSubscription = {
        email,
        subscriptionArn: response.subscriptionArn,
        status: 'PendingConfirmation'
      };
      
      setSubscriptions(prev => [...prev, newSubscription]);
    } catch (err) {
      console.error('Failed to subscribe:', err);
      throw new Error('Failed to subscribe email. Please try again.');
    } finally {
      setSubscribing(false);
    }
  }, [subscriptions]);

  const unsubscribe = useCallback(async (email: string) => {
    setUnsubscribing(email);
    setError(null);

    try {
      await api.unsubscribeFromAlerts(email);
      
      // Remove the subscription from the list optimistically
      setSubscriptions(prev => prev.filter(sub => sub.email !== email));
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      throw new Error('Failed to unsubscribe email. Please try again.');
    } finally {
      setUnsubscribing(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load subscriptions on mount
  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    refreshing,
    subscribing,
    unsubscribing,
    subscribe,
    unsubscribe,
    refresh,
    clearError
  };
} 