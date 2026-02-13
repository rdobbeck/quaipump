"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

export interface State {
  account: string | null;
  web3Provider: unknown | null;
  rpcProvider: unknown | null;
}

export type Action =
  | { type: "SET_ACCOUNT"; payload: string | null }
  | { type: "SET_WEB3_PROVIDER"; payload: unknown | null }
  | { type: "SET_RPC_PROVIDER"; payload: unknown | null }
  | { type: "DISCONNECT" };

const initialState: State = {
  account: null,
  web3Provider: null,
  rpcProvider: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ACCOUNT":
      return { ...state, account: action.payload };
    case "SET_WEB3_PROVIDER":
      return { ...state, web3Provider: action.payload };
    case "SET_RPC_PROVIDER":
      return { ...state, rpcProvider: action.payload };
    case "DISCONNECT":
      return initialState;
    default:
      return state;
  }
}

const StateContext = createContext<State>(initialState);
const DispatchContext = createContext<Dispatch<Action>>(() => {});

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState() {
  return useContext(StateContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
