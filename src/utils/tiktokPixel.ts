// TikTok Pixel tracking utilities
declare global {
  interface Window {
    ttq?: {
      track: (eventName: string, params?: Record<string, any>) => void;
      page: () => void;
      identify: (params?: Record<string, any>) => void;
    };
  }
}

// SHA-256 hash function
async function sha256(message: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    console.warn('Web Crypto API not available');
    return '';
  }
  
  try {
    const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Error hashing:', error);
    return '';
  }
}

// Helper function to safely track events
const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.ttq) {
    try {
      window.ttq.track(eventName, params);
      console.log(`TikTok Pixel: ${eventName}`, params);
    } catch (error) {
      console.error('Error tracking TikTok Pixel event:', error);
    }
  }
};

// Identify user with hashed PII
export const identifyUser = async (data: {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
}) => {
  if (typeof window !== 'undefined' && window.ttq) {
    try {
      const identifyParams: Record<string, string> = {};
      
      if (data.email) {
        identifyParams.email = await sha256(data.email);
      }
      
      if (data.phoneNumber) {
        // Remove any non-digit characters before hashing
        const cleanPhone = data.phoneNumber.replace(/\D/g, '');
        identifyParams.phone_number = await sha256(cleanPhone);
      }
      
      if (data.externalId) {
        identifyParams.external_id = await sha256(data.externalId);
      }
      
      if (Object.keys(identifyParams).length > 0) {
        window.ttq.identify(identifyParams);
        console.log('TikTok Pixel: User identified');
      }
    } catch (error) {
      console.error('Error identifying user:', error);
    }
  }
};

// Landing page events
export const trackViewContent = (
  contentType: string = 'landing',
  contentDetails?: {
    contentId?: string;
    contentName?: string;
    value?: number;
    currency?: string;
  }
) => {
  const params: Record<string, any> = {
    content_type: contentType,
    content_name: contentDetails?.contentName || 'Wipsy Landing Page'
  };
  
  if (contentDetails?.contentId) {
    params.contents = [{
      content_id: contentDetails.contentId,
      content_type: contentType,
      content_name: contentDetails.contentName || 'Wipsy Landing Page'
    }];
  }
  
  if (contentDetails?.value) {
    params.value = contentDetails.value;
    params.currency = contentDetails.currency || 'USD';
  }
  
  trackEvent('ViewContent', params);
};

// Demo booking and lead events
export const trackSubmitForm = (formType: string = 'demo_booking') => {
  trackEvent('SubmitForm', {
    content_name: formType
  });
};

export const trackLead = (data?: {
  contentId?: string;
  contentName?: string;
  value?: number;
  currency?: string;
}) => {
  const params: Record<string, any> = {
    content_name: data?.contentName || 'Demo Booking'
  };
  
  if (data?.contentId) {
    params.contents = [{
      content_id: data.contentId,
      content_type: 'service',
      content_name: data.contentName || 'Demo Booking'
    }];
  }
  
  if (data?.value) {
    params.value = data.value;
    params.currency = data.currency || 'USD';
  }
  
  trackEvent('Lead', params);
};

export const trackContact = (data?: {
  contentName?: string;
  value?: number;
}) => {
  trackEvent('Contact', {
    content_name: data?.contentName || 'Contact Form',
    ...(data?.value && { value: data.value, currency: 'USD' })
  });
};

export const trackCompleteRegistration = (
  method: string = 'email',
  data?: {
    contentId?: string;
    value?: number;
  }
) => {
  const params: Record<string, any> = {
    content_name: 'User Registration',
    registration_method: method
  };
  
  if (data?.contentId) {
    params.contents = [{
      content_id: data.contentId,
      content_type: 'subscription_plan',
      content_name: 'User Registration'
    }];
  }
  
  if (data?.value) {
    params.value = data.value;
    params.currency = 'USD';
  }
  
  trackEvent('CompleteRegistration', params);
};

// Checkout and subscription events
export const trackInitiateCheckout = (planId: string, planName: string, value: number) => {
  trackEvent('InitiateCheckout', {
    contents: [{
      content_id: planId,
      content_type: 'subscription_plan',
      content_name: planName
    }],
    content_name: planName,
    value: value,
    currency: 'USD'
  });
};

export const trackPlaceAnOrder = (
  planId: string,
  planName: string,
  value: number,
  transactionId?: string
) => {
  trackEvent('PlaceAnOrder', {
    contents: [{
      content_id: planId,
      content_type: 'subscription',
      content_name: planName
    }],
    content_name: planName,
    value: value,
    currency: 'USD',
    ...(transactionId && { order_id: transactionId })
  });
};

// Custom events
export const trackCustomEvent = (eventName: string, params?: Record<string, any>) => {
  trackEvent(eventName, params);
};
