export const showToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message, type }
    }));
};
