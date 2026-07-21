export const base44 = {
  auth: {
    logout: (redirect = '/') => {
      // placeholder: clear local storage and redirect
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
      if (typeof window !== 'undefined') window.location.href = redirect;
    },
  },
  entities: {},
};

export default base44;
