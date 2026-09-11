import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'AUTH_FAILURE':
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      dispatch({ type: 'AUTH_FAILURE' });
      return;
    }

    authApi
      .getMe()
      .then((user) => {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token: storedToken },
        });
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        dispatch({ type: 'AUTH_FAILURE' });
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const { access_token } = await authApi.login(email, password);
    localStorage.setItem('auth_token', access_token);

    const user = await authApi.getMe();
    dispatch({
      type: 'AUTH_SUCCESS',
      payload: { user, token: access_token },
    });
    return user;
  }, []);

  const register = useCallback(async (email, password) => {
    await authApi.register(email, password);
    return login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
