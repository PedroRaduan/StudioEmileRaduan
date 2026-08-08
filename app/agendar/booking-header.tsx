import Link from "next/link";

export function BookingHeader({ step }: { step: 1 | 2 | 3 }) {
  return <header className="booking-header"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link><div className="booking-progress" aria-label={`Etapa ${step} de 3`}><span>Etapa {step} de 3</span><i><b style={{ width: `${step / 3 * 100}%` }} /></i></div><Link className="header-link" href="/conta">Minha conta</Link></header>;
}
