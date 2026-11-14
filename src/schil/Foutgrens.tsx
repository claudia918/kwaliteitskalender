import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '../componenten/Button';

interface Props {
  children: ReactNode;
  /** Bij wisselen van deze sleutel (bv. route) wordt de fout gewist */
  resetSleutel?: string;
}
interface State {
  fout: Error | null;
  sleutel?: string;
}

/** Foutgrens: teksten zoals het origineel. Gegevens staan veilig in de browser. */
export class Foutgrens extends Component<Props, State> {
  state: State = { fout: null, sleutel: this.props.resetSleutel };

  static getDerivedStateFromError(fout: Error): Partial<State> {
    return { fout };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetSleutel !== state.sleutel) return { fout: null, sleutel: props.resetSleutel };
    return null;
  }

  componentDidCatch(fout: Error, info: ErrorInfo) {
    // alleen lokaal in de console; er wordt niets verstuurd
    console.error('Kwaliteitskalender: onverwachte fout', fout, info.componentStack);
  }

  render() {
    if (!this.state.fout) return this.props.children;
    return (
      <div role="alert" className="mx-auto my-10 max-w-lg rounded-lg border border-line-subtle bg-surface-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-status-warning-surface text-status-warning">
            <TriangleAlert className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-h3">Er ging iets mis</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Er trad een onverwachte fout op. Je kalendergegevens zijn lokaal opgeslagen en gaan niet verloren.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => this.setState({ fout: null })}>
                Probeer opnieuw
              </Button>
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => window.location.reload()}>
                Herlaad de pagina
              </Button>
            </div>
            <details className="mt-4 text-xs text-ink-subtle">
              <summary className="cursor-pointer">Technische details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-sm bg-surface-sunken p-2">
                {String(this.state.fout?.message ?? this.state.fout)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }
}
