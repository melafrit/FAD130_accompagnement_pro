import { Component, type ReactNode } from 'react'

// Garde-fou pour les modales chargées à la demande : si le chunk échoue à charger
// (réseau, build), on affiche un message au lieu de casser toute la page.
export default class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  reset = () => { this.setState({ hasError: false }); this.props.onReset?.() }
  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay" onMouseDown={this.reset}>
          <div className="modal" role="alertdialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <p className="form-error">Impossible d’ouvrir ce module pour le moment. Réessaie.</p>
            </div>
            <div className="modal-actions">
              <span />
              <div className="modal-actions-right"><button type="button" className="btn btn-primary" onClick={this.reset}>Fermer</button></div>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
