// Meta Pixel tracking utilities
declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      params?: Record<string, any>,
      options?: { eventID?: string }
    ) => void;
  }
}

// Generate unique event ID for deduplication
const generateEventId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to safely track events with deduplication
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      const eventId = generateEventId();
      window.fbq('track', eventName, params, { eventID: eventId });
      console.log(`Meta Pixel: ${eventName}`, { ...params, eventID: eventId });
      return eventId;
    } catch (error) {
      console.error('Error tracking Meta Pixel event:', error);
      return null;
    }
  }
  return null;
};

// Landing page events
export const trackViewContent = (contentType: string = 'landing') => {
  return trackEvent('ViewContent', {
    content_type: contentType,
    content_name: 'Wipsy Landing Page'
  });
};

export const trackLead = (actionType: string) => {
  return trackEvent('Lead', {
    content_name: actionType,
    status: 'initiated'
  });
};

export const trackInitiateCheckout = (planId: string, planName: string, value: number) => {
  return trackEvent('InitiateCheckout', {
    content_ids: [planId],
    content_name: planName,
    content_category: 'subscription_plan',
    value: value,
    currency: 'USD',
    num_items: 1
  });
};

// Auth page events
export const trackCompleteRegistration = (planId?: string, method: string = 'email') => {
  return trackEvent('CompleteRegistration', {
    content_name: 'User Registration',
    registration_method: method,
    ...(planId && { selected_plan: planId })
  });
};

// Purchase events
export const trackPurchase = (
  planId: string,
  planName: string,
  value: number,
  transactionId?: string
) => {
  return trackEvent('Purchase', {
    content_ids: [planId],
    content_name: planName,
    content_type: 'subscription',
    value: value,
    currency: 'USD',
    ...(transactionId && { transaction_id: transactionId })
  });
};

// Custom events
export const trackCustomEvent = (eventName: string, params?: Record<string, any>) => {
  return trackEvent(eventName, params);
};
