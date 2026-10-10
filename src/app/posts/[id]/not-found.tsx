import Link from "next/link";

export default function PostNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Post não encontrado</h1>
      <p>Esse post não existe ou o endereço está incorreto.</p>
      <Link href="/" className="btn">
        Voltar para o início
      </Link>
    </div>
  );
}
