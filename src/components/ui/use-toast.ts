import * as React from "react"

import { ToastAction } from "./toast"
import { type ToastProps } from "./toast"
import { cn } from "@/lib/utils"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = Omit<ToastProps, "title"> & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement<typeof ToastAction>
  position?: "top-center" | "top-right" | "top-left" | "bottom-center" | "bottom-right" | "bottom-left"
  timeoutRef?: ReturnType<typeof setTimeout>
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type Action =
  | {
      type: typeof actionTypes.ADD_TOAST
      toast: ToasterToast
    }
  | {
      type: typeof actionTypes.UPDATE_TOAST
      toast: Partial<ToasterToast>
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST
      toastId?: ToasterToast["id"]
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      // ! Side effects ! - This means it is not a pure reducer.
      // We *just* missed the case where toastId is undefined, but that is A-OK.
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === toastId ? { ...toast, open: false } : toast
        ),
      }
    }
    case actionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: ((state: State) => void)[] = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Omit<ToasterToast, "id">

type ToastFn = {
  (props: Toast): {
    id: string
    dismiss: () => void
    update: (props: ToasterToast) => void
  }
  info: (title: React.ReactNode, options?: Omit<Toast, "title">) => {
    id: string
    dismiss: () => void
    update: (props: ToasterToast) => void
  }
  success: (title: React.ReactNode, options?: Omit<Toast, "title">) => {
    id: string
    dismiss: () => void
    update: (props: ToasterToast) => void
  }
  error: (title: React.ReactNode, options?: Omit<Toast, "title">) => {
    id: string
    dismiss: () => void
    update: (props: ToasterToast) => void
  }
  warning: (title: React.ReactNode, options?: Omit<Toast, "title">) => {
    id: string
    dismiss: () => void
    update: (props: ToasterToast) => void
  }
}

function createToast({ ...props }: Toast) {
  const id = genId()
  let timeoutRef: ReturnType<typeof setTimeout> | undefined

  const update = (props: ToasterToast) =>
    dispatch({ type: actionTypes.UPDATE_TOAST, toast: { ...props, id } })
  const dismiss = () => {
    if (timeoutRef) {
      clearTimeout(timeoutRef)
    }
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })
  }

  timeoutRef = setTimeout(() => dismiss(), TOAST_REMOVE_DELAY)

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
      timeoutRef,
    },
  })
  return {
    id: id,
    dismiss,
    update,
  }
}

const baseInfoClass = "border-slate-200/80 bg-slate-50 text-slate-900"
const baseSuccessClass = "border-emerald-200/70 bg-emerald-50 text-emerald-900"
const baseErrorClass = "border-rose-200/70 bg-rose-50 text-rose-900"
const baseWarningClass = "border-amber-200/70 bg-amber-50 text-amber-900"

const toast = Object.assign(createToast, {
  info: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    createToast({
      title,
      ...options,
      className: cn(baseInfoClass, options.className),
    }),
  success: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    createToast({
      title,
      ...options,
      className: cn(baseSuccessClass, options.className),
    }),
  error: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    createToast({
      title,
      ...options,
      className: cn(baseErrorClass, options.className),
    }),
  warning: (title: React.ReactNode, options: Omit<Toast, "title"> = {}) =>
    createToast({
      title,
      ...options,
      className: cn(baseWarningClass, options.className),
    }),
}) as ToastFn

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  }
}

export { useToast, toast }
