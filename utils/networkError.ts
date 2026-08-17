export const isNetworkError = (error: any): boolean => {
    return !error.response;
};

export const NETWORK_OFFLINE_MESSAGE = "Oops! Looks like the internet connection is gone. Try when you're back online.";
