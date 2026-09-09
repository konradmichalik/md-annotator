export const initialAnnotationState = {
  annotations: [],
  history: [],
  redo: []
}

let idCounter = 0
export function createAnnotationId() {
  idCounter += 1
  return `ann-${idCounter}`
}

export function annotationReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return {
        annotations: [...state.annotations, action.annotation],
        history: [...state.history, { action: 'add', annotation: action.annotation }],
        redo: []
      }
    case 'UPDATE':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.id ? { ...a, ...action.changes } : a
        )
      }
    case 'REMOVE': {
      const removed = state.annotations.find((a) => a.id === action.id)
      if (!removed) { return state }
      return {
        annotations: state.annotations.filter((a) => a.id !== action.id),
        history: [...state.history, { action: 'remove', annotation: removed }],
        redo: []
      }
    }
    case 'SET_ALL':
      return { ...state, annotations: action.annotations }
    default:
      return state
  }
}
