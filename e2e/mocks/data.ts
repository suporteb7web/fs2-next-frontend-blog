export const mockPublicPostTitle = "Post público do mock";

export const PAGE_SIZE = 10;

/** Destino do checkout no mock. Os testes barram essa origem e não carregam o Stripe. */
export const mockCheckoutUrl = "https://checkout.stripe.com/c/pay/cs_test_mock";

/** Valor que não é URL http(s). O app deve recusar sem navegar. */
export const mockInvalidCheckoutUrl = "notaurl";

/** Local-part do e-mail. Cada teste completa com um id único. */
export const mockEmailPrefix = {
  premium: "premium-",
  checkoutError: "checkout-error-",
  checkoutConflict: "checkout-conflict-",
  checkoutInvalidUrl: "checkout-invalid-",
} as const;

export type MockUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  avatar: string | null;
  premium: boolean;
  token: string;
};

export type MockReply = {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
};

export type MockPost = {
  id: number;
  title: string;
  content: string;
  image: string | null;
  premium: boolean;
  createdAt: string;
  authorId: number;
  likedBy: number[];
  replies: MockReply[];
};

export const seedUsers: MockUser[] = [
  {
    id: 1,
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "secret1",
    avatar: null,
    premium: false,
    token: "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01",
  },
  {
    id: 2,
    name: "Grace Hopper",
    email: "grace@example.com",
    password: "secret1",
    avatar: null,
    premium: true,
    token: "b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef0123",
  },
];

export const seedPosts: MockPost[] = [
  {
    id: 1,
    title: mockPublicPostTitle,
    content: "Conteúdo servido pelo mock do MSW.",
    image: null,
    premium: false,
    createdAt: "2026-08-07T21:00:00.000Z",
    authorId: 1,
    likedBy: [1],
    replies: [
      {
        id: 1,
        content: "Uma resposta do mock.",
        createdAt: "2026-08-07T21:05:00.000Z",
        authorId: 2,
      },
    ],
  },
  {
    id: 2,
    title: "Segundo post do mock",
    content: "Outro post público para a listagem.",
    image: null,
    premium: false,
    createdAt: "2026-08-01T12:00:00.000Z",
    authorId: 1,
    likedBy: [],
    replies: [],
  },
  {
    id: 3,
    title: "Post premium do mock",
    content: "Só aparece para quem é premium.",
    image: null,
    premium: true,
    createdAt: "2026-08-08T21:00:00.000Z",
    authorId: 2,
    likedBy: [],
    replies: [],
  },
];
