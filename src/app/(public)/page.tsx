import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, ChefHat, ClipboardList, CreditCard, Package, QrCode, Users, Utensils } from 'lucide-react';
import './landing.css';
import LandingEffects from './LandingEffects';

const features = [
  { icon: QrCode, title: 'O atendimento começa à mesa', text: 'Menu por QR Code, mesas organizadas por área e pedidos com observações para a equipa.' },
  { icon: ChefHat, title: 'Cozinha e bar em sintonia', text: 'Cada equipa acompanha os seus pedidos e a preparação, no mesmo sistema.' },
  { icon: Package, title: 'Stock com responsabilidade', text: 'Compras, ingredientes, requisições e levantamentos registados pelo economato.' },
  { icon: CreditCard, title: 'Um fecho de conta mais simples', text: 'Consulte o consumo, divida pagamentos e aceda aos documentos de cada atendimento.' },
  { icon: Users, title: 'Um espaço para cada função', text: 'Perfis para gestão, caixa, atendimento, cozinha, bar e economato.' },
  { icon: ClipboardList, title: 'Os números ao seu alcance', text: 'Acompanhe vendas, pedidos e disponibilidade para organizar a operação.' },
];
const plans = [
  { name: 'Starter', audience: 'Para uma operação pequena', items: ['Até 10 mesas', 'Gestão de pedidos', 'Relatórios básicos', '1 utilizador admin'] },
  { name: 'Profissional', audience: 'Para uma equipa em crescimento', items: ['Até 30 mesas', 'Multi-utilizador', 'Cozinha e bar', 'Stock e facturação'] },
  { name: 'Enterprise', audience: 'Para operações com maior dimensão', items: ['Mesas ilimitadas', 'Multi-organização', 'Suporte prioritário', 'Personalização'] },
];

export default function HomePage() {
  return <main className="sf-home">
    <LandingEffects />
    <section className="sf-hero">
      <div className="sf-wrap sf-hero-grid">
        <div className="sf-hero-copy">
          <p className="sf-eyebrow"><span /> PENSADO PARA A RESTAURAÇÃO EM ANGOLA</p>
          <h1>Mais atenção<br />ao cliente.<br /><em>Mais controlo</em><br />do restaurante.</h1>
          <p className="sf-lead">Da primeira mesa ao fecho do caixa, ligue o atendimento, a cozinha e o stock num único lugar.</p>
          <div className="sf-actions"><Link href="/register" className="sf-button">Começar agora <ArrowRight size={18} /></Link><a href="#features" className="sf-text-link">Conhecer o sistema <ArrowUpRight size={17} /></a></div>
          <div className="sf-hero-notes"><span><Check size={15} /> Perfis por função</span><span><Check size={15} /> Pedidos em tempo real</span></div>
        </div>
        <div className="sf-hero-visual">
          <div className="sf-photo"><Image src="/barTender.jpg" alt="Preparação de uma bebida no balcão de um bar" fill priority sizes="(max-width: 900px) 100vw, 50vw" className="object-cover" /><div className="sf-photo-caption"><span>O seu serviço, bem acompanhado.</span><p>Do balcão à última mesa.</p></div></div>
          <div className="sf-order-card" aria-label="Exemplo ilustrativo de um pedido"><div className="sf-order-top"><span className="sf-icon"><Utensils size={20} /></span><div><strong>Mesa 08</strong><small>Exemplo de atendimento</small></div><span className="sf-status">Em preparação</span></div><div className="sf-order-line"><span>2 × Prato do dia</span><Check size={16} /></div><div className="sf-order-line"><span>1 × Água mineral</span><Check size={16} /></div><div className="sf-order-bottom"><span>Cozinha e bar</span><span>Um só pedido <ArrowRight size={14} /></span></div></div>
        </div>
      </div>
    </section>
    <div className="sf-strip"><div className="sf-wrap"><span>UMA OPERAÇÃO CONECTADA</span><p>Mesas <i /> Pedidos <i /> Cozinha <i /> Economato <i /> Caixa</p></div></div>
    <section id="features" className="sf-section sf-wrap">
      <div className="sf-section-heading"><div><p className="sf-eyebrow">DO ATENDIMENTO À GESTÃO</p><h2>Cada equipa no seu lugar.<br />Tudo a funcionar em conjunto.</h2></div><p>Menos informação espalhada. Uma visão clara do que está a acontecer no seu restaurante.</p></div>
      <div className="sf-feature-grid">{features.map(({icon: Icon, title, text}, i) => <article key={title}><div className="sf-feature-top"><Icon size={24} /><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section id="como-funciona" className="sf-workflow"><div className="sf-wrap"><p className="sf-eyebrow">SIMPLES DE ACOMPANHAR</p><h2>Um pedido. Um percurso claro.</h2><div className="sf-steps">{[
      ['01', 'Receba o pedido', 'O atendimento regista os produtos e as observações do cliente.'],
      ['02', 'Prepare e acompanhe', 'Cozinha, bar e economato acompanham o que precisam de preparar ou entregar.'],
      ['03', 'Feche com confiança', 'Confira o consumo, registe o pagamento e emita o documento.'],
    ].map(([n, title, text]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section id="pricing" className="sf-section sf-wrap"><div className="sf-section-heading"><div><p className="sf-eyebrow">PLANOS</p><h2>À medida da sua operação.</h2></div><p>Compare as opções. Os valores e as condições de implementação são definidos sob consulta.</p></div><div className="sf-plan-grid">{plans.map((plan, i) => <article key={plan.name} className={i === 1 ? 'sf-plan sf-plan-featured' : 'sf-plan'}><p className="sf-plan-label">{i === 1 ? 'PARA O DIA A DIA DA EQUIPA' : 'SERVE FIXE'}</p><h3>{plan.name}</h3><p>{plan.audience}</p><strong className="sf-price">Sob consulta</strong><ul>{plan.items.map(item => <li key={item}><Check size={16} />{item}</li>)}</ul><a href="mailto:info@servefixe.com" className="sf-button">Consultar condições <ArrowUpRight size={16} /></a></article>)}</div></section>
    <section className="sf-cta sf-wrap"><div><p className="sf-eyebrow">O PRÓXIMO PASSO</p><h2>Dê mais espaço<br />ao bom serviço.</h2><p>Organize a sua operação com o Serve Fixe.</p></div><Link href="/register" className="sf-button">Criar a minha conta <ArrowRight size={18} /></Link></section>
    <footer className="sf-footer sf-wrap"><div><Link href="/" className="sf-footer-brand">Serve Fixe<span>®</span></Link><p>Gestão de restaurantes e bares.<br />Luanda, Angola.</p></div><nav aria-label="Links do rodapé"><a href="#features">Funcionalidades</a><a href="#pricing">Planos</a><Link href="/login">Entrar no painel</Link></nav><div><a href="mailto:info@servefixe.com">info@servefixe.com</a><a href="tel:+244949714096">+244 949 714 096</a></div><small>© {new Date().getFullYear()} Serve Fixe. Todos os direitos reservados.</small></footer>
  </main>;
}
