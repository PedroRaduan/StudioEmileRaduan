import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "../client-form";

export default function NewClientPage() { return <main className="admin-page editor-page"><Link className="back-link" href="/admin/clientes"><ArrowLeft size={17} /> Voltar para clientes</Link><div className="editor-heading"><p className="eyebrow">Nova cliente</p><h1>Comece pelo essencial.</h1><p>Registre apenas os dados necessários para organizar o atendimento.</p></div><section className="editor-card"><ClientForm /></section></main>; }
