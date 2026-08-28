import Link from "next/link";
import { ProcesaLogo } from "./procesa-logo";
import { ThemeToggle } from "./theme-toggle";
import { Icon } from "./icon";

const legacySteps = ["Plan", "Empresa", "Módulos", "Sucursal", "Listo"];

export function OnboardingShell({step,title,subtitle,children,steps=legacySteps,backHref,context}:{step:number;title:string;subtitle:string;children:React.ReactNode;steps?:readonly string[];backHref?:string;context?:string}){return <main className="onboarding-premium"><header className="onboarding-header"><div className="onboarding-brand"><ProcesaLogo/><span>Configuración inicial</span></div><ThemeToggle/></header><div className="onboarding-body"><aside className="onboarding-progress"><span className="section-kicker">ACTIVACIÓN PROCESA</span><h1>De tu negocio a una operación conectada.</h1><p>Guardamos cada avance para que puedas continuar desde cualquier dispositivo.</p>{context&&<div className="onboarding-context"><span>CONTEXTO</span><b>{context}</b></div>}<ol className="stepper">{steps.map((x,i)=><li className={i+1<step?"complete":i+1===step?"active":""} key={x}><i>{i+1<step?<Icon name="check" size={14}/>:i+1}</i><span>{x}</span></li>)}</ol></aside><section className="onboarding-stage"><div className="onboarding-card">{backHref&&<Link className="onboarding-back" href={backHref}>← Volver</Link>}<span className="step-label">PASO {step} DE {steps.length}</span><h2>{title}</h2><p className="onboarding-subtitle">{subtitle}</p>{children}<small className="onboarding-save-note">El progreso se guarda al continuar.</small></div></section></div></main>}
