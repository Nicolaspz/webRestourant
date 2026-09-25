import Link from 'next/link';
export default function LegacyRegistration(){
 return <main className="p-8"><h1>Cadastro da organização</h1><p>O primeiro SUPER ADMIN é criado juntamente com a organização. Para uma organização existente, peça ao administrador que crie a sua conta.</p><Link href="/register">Criar organização e administrador</Link><br/><Link href="/login">Iniciar sessão</Link></main>;
}
