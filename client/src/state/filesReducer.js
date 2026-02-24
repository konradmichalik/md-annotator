import { annotationReducer, initialAnnotationState } from './annotationReducer.js'

export function filesReducer(state, action) {
  switch (action.type) {
    case 'INIT_FILES':
      return action.files.map(f => ({
        ...f,
        annState: { ...initialAnnotationState }
      }))
    case 'ADD_FILE':
      return [...state, { ...action.file, annState: { ...initialAnnotationState } }]
    case 'UPDATE_FILE': {
      const idx = action.fileIndex
      if (idx < 0 || idx >= state.length) {return state}
      return state.map((f, i) => i !== idx ? f : { ...f, ...action.updates })
    }
    case 'ANN': {
      const idx = action.fileIndex
      if (idx < 0 || idx >= state.length) {return state}
      return state.map((f, i) => {
        if (i !== idx) {return f}
        return { ...f, annState: annotationReducer(f.annState, action.annAction) }
      })
    }
    default:
      return state
  }
}
