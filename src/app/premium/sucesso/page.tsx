import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pagamento em análise",
};

export default function PremiumSuccessPage() {
  return (
    <div className="card card-border w-full">
      <div className="card-body">
        <h1 className="card-title text-2xl">Pagamento em análise</h1>
        <p>O pagamento está sendo analisado. Você já pode fechar esta página.</p>
      </div>
    </div>
  );
}
