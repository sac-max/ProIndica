
export const createCheckoutSession = async (userId: string, userEmail: string) => {
  try {
    console.log('Creating checkout session for:', { userId, userEmail });
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userEmail }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Server error creating checkout session:', errorData);
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const session = await response.json();
    console.log('Checkout session received:', session);

    if (session.error) {
      throw new Error(session.error);
    }

    if (!session.url) {
      throw new Error('No checkout URL received');
    }

    // Check if we are in an iframe
    const isInIframe = window.self !== window.top;

    // Try to open in a new tab immediately
    const newWindow = window.open(session.url, '_blank');
    
    if (newWindow) {
      console.log('Payment window opened successfully');
      return { url: session.url, isInIframe, opened: true };
    }

    if (isInIframe) {
      console.warn('App is running in an iframe and window.open was blocked. Showing manual button.');
      return { url: session.url, isInIframe: true, opened: false };
    }

    // If not in iframe and window.open failed, try redirect
    window.location.href = session.url;
    return { url: session.url, isInIframe: false, opened: true };
  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
};

export const syncPayments = async () => {
  try {
    const response = await fetch('/api/sync-payments');
    if (!response.ok) {
      throw new Error('Failed to sync payments');
    }
    return await response.json();
  } catch (error) {
    console.error('Sync payments error:', error);
    throw error;
  }
};
