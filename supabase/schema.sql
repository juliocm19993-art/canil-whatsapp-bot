create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text,
  telefone text unique not null,
  interesse text,
  status text default 'novo',
  ultima_mensagem text,
  created_at timestamp with time zone default now()
);

create table if not exists filhotes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sexo text not null,
  cor text,
  idade text,
  valor numeric,
  descricao text,
  foto_url text,
  status text default 'disponivel',
  created_at timestamp with time zone default now()
);

create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  telefone text,
  mensagem_cliente text,
  resposta_ia text,
  created_at timestamp with time zone default now()
);

insert into filhotes (nome, sexo, cor, idade, valor, descricao, status)
values
('Macho Blue', 'macho', 'blue', '60 dias', 4500, 'Bulldog Francês macho blue, vacinado e vermifugado.', 'disponivel'),
('Fêmea Creme', 'femea', 'creme', '65 dias', 5200, 'Bulldog Francês fêmea creme, dócil e saudável.', 'disponivel');
