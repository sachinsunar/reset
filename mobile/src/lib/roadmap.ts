export interface RoadmapSeed {
  title: string;
  description: string;
}

export const NESTJS_ROADMAP: RoadmapSeed[] = [
  {
    title: 'NestJS fundamentals',
    description: 'Project structure, CLI, bootstrapping, and how a Nest app starts.',
  },
  {
    title: 'Modules, controllers, providers',
    description: 'Organize features into modules and expose clean HTTP controllers.',
  },
  {
    title: 'Dependency injection',
    description: 'Providers, scopes, custom providers, and injecting abstractions.',
  },
  {
    title: 'DTOs and validation',
    description: 'class-validator, class-transformer, and typed request boundaries.',
  },
  {
    title: 'Pipes and guards',
    description: 'Transformation, validation pipes, authentication and role guards.',
  },
  {
    title: 'Authentication and authorization',
    description: 'JWT strategy, password hashing, refresh tokens, and RBAC.',
  },
  {
    title: 'Prisma and PostgreSQL',
    description: 'Schema design, migrations, relations, transactions, and query patterns.',
  },
  {
    title: 'REST API architecture',
    description: 'Resource design, pagination, filtering, versioning, and error contracts.',
  },
  {
    title: 'LMS project architecture',
    description: 'Model courses, lessons, enrollment, progress, and roles in a real project.',
  },
  {
    title: 'Testing and deployment',
    description: 'Unit and e2e tests, CI, Docker, environment config, and VPS deployment.',
  },
];

export interface AcademicSubjectSeed {
  id: string;
  name: string;
  code: string;
  priority: number;
  allocation: number;
  color: string;
}

export const SUBJECT_SEEDS: AcademicSubjectSeed[] = [
  {
    id: 'numerical-method',
    name: 'Numerical Method',
    code: 'BCA · Backlog 1',
    priority: 1,
    allocation: 45,
    color: '#7A28A8',
  },
  {
    id: 'operating-system',
    name: 'Operating System',
    code: 'BCA · Backlog 2',
    priority: 2,
    allocation: 30,
    color: '#008F8D',
  },
  {
    id: 'software-engineering',
    name: 'Software Engineering',
    code: 'BCA · Backlog 3',
    priority: 3,
    allocation: 25,
    color: '#806F00',
  },
];

export const TOPIC_STATUS_LABELS = {
  not_started: 'Not started',
  learning: 'Learning',
  practiced: 'Practiced',
  needs_revision: 'Needs revision',
  completed: 'Completed',
} as const;

export const LEARNING_STATUS_LABELS = {
  not_started: 'Not started',
  learning: 'Learning',
  practiced: 'Practiced',
  completed: 'Completed',
} as const;
