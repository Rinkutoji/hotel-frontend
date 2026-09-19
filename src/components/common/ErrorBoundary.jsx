import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info)
  }

  handleReset = () => {
    if (typeof this.props.onReset === 'function') {
      this.props.onReset()
    } else {
      window.location.reload()
    }
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.handleReset)
        : this.props.fallback
    }

    return (
      <div
        role="alert"
        className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.94 5h13.86A1.954 1.954 0 0020 18.5V5.5a1.954 1.954 0 00-1.94-2H5.94A1.954 1.954 0 004 5.5v13A1.954 1.954 0 006 18.5z" />
          </svg>
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-800">Something went wrong</h2>
        <p className="mt-2 max-w-sm text-sm text-red-700">
          The page could not be displayed. Try reloading to continue.
        </p>
        <button type="button" className="mt-6 btn-outline" onClick={this.handleReset}>
          Reload
        </button>
      </div>
    )
  }
}