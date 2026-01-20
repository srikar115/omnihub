# API Development Instructions

> **For AI Agents & Developers**: Follow these guidelines when creating or modifying services in this NestJS API.

---

## SOLID Principles

All services must adhere to SOLID principles:

### 1. Single Responsibility Principle (SRP)

**Each class should have only one reason to change.**

```typescript
// ❌ BAD: Service doing too many things
@Injectable()
export class UserService {
  async createUser() { /* ... */ }
  async sendWelcomeEmail() { /* ... */ }  // Not user's responsibility
  async generateInvoice() { /* ... */ }   // Not user's responsibility
  async uploadAvatar() { /* ... */ }      // Should be separate
}

// ✅ GOOD: Single responsibility per service
@Injectable()
export class UserService {
  async createUser() { /* ... */ }
  async updateUser() { /* ... */ }
  async deleteUser() { /* ... */ }
  async findUser() { /* ... */ }
}

@Injectable()
export class EmailService {
  async sendWelcomeEmail() { /* ... */ }
}

@Injectable()
export class StorageService {
  async uploadFile() { /* ... */ }
}
```

---

### 2. Open/Closed Principle (OCP)

**Classes should be open for extension but closed for modification.**

```typescript
// ❌ BAD: Modifying existing code for new providers
@Injectable()
export class PaymentService {
  async processPayment(type: string, amount: number) {
    if (type === 'razorpay') {
      // Razorpay logic
    } else if (type === 'stripe') {
      // Stripe logic - had to modify existing code!
    } else if (type === 'paypal') {
      // PayPal logic - more modifications!
    }
  }
}

// ✅ GOOD: Extend via new classes, not modifications
export interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

@Injectable()
export class RazorpayProcessor implements PaymentProcessor {
  async process(amount: number) { /* ... */ }
}

@Injectable()
export class StripeProcessor implements PaymentProcessor {
  async process(amount: number) { /* ... */ }
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT_PROCESSORS') 
    private processors: Map<string, PaymentProcessor>
  ) {}

  async processPayment(type: string, amount: number) {
    const processor = this.processors.get(type);
    return processor.process(amount);
  }
}
```

---

### 3. Liskov Substitution Principle (LSP)

**Subtypes must be substitutable for their base types.**

```typescript
// ❌ BAD: Subclass breaks parent contract
class BaseStorage {
  async save(file: Buffer): Promise<string> {
    return 'path/to/file';
  }
}

class ReadOnlyStorage extends BaseStorage {
  async save(file: Buffer): Promise<string> {
    throw new Error('Cannot save!'); // Breaks the contract!
  }
}

// ✅ GOOD: All implementations honor the contract
interface StorageProvider {
  save(file: Buffer): Promise<string>;
  retrieve(path: string): Promise<Buffer>;
}

@Injectable()
export class LocalStorage implements StorageProvider {
  async save(file: Buffer) { return '/local/path'; }
  async retrieve(path: string) { return Buffer.from(''); }
}

@Injectable()
export class S3Storage implements StorageProvider {
  async save(file: Buffer) { return 's3://bucket/key'; }
  async retrieve(path: string) { return Buffer.from(''); }
}
```

---

### 4. Interface Segregation Principle (ISP)

**Clients should not depend on interfaces they don't use.**

```typescript
// ❌ BAD: Fat interface forcing unnecessary implementations
interface AIProvider {
  generateImage(prompt: string): Promise<string>;
  generateVideo(prompt: string): Promise<string>;
  generateAudio(prompt: string): Promise<string>;
  chat(message: string): Promise<string>;
  transcribe(audio: Buffer): Promise<string>;
}

// Service that only needs image generation must implement ALL methods

// ✅ GOOD: Segregated interfaces
interface ImageGenerator {
  generateImage(prompt: string): Promise<string>;
}

interface VideoGenerator {
  generateVideo(prompt: string): Promise<string>;
}

interface ChatProvider {
  chat(message: string): Promise<string>;
}

// Services implement only what they need
@Injectable()
export class FalProvider implements ImageGenerator, VideoGenerator {
  async generateImage(prompt: string) { /* ... */ }
  async generateVideo(prompt: string) { /* ... */ }
}

@Injectable()
export class OpenAIProvider implements ChatProvider {
  async chat(message: string) { /* ... */ }
}
```

---

### 5. Dependency Inversion Principle (DIP)

**Depend on abstractions, not concretions.**

```typescript
// ❌ BAD: Direct dependency on concrete class
@Injectable()
export class GenerationService {
  private falProvider = new FalProvider(); // Tight coupling!

  async generate(prompt: string) {
    return this.falProvider.generate(prompt);
  }
}

// ✅ GOOD: Depend on abstraction via DI
export interface AIProvider {
  generate(prompt: string): Promise<GenerationResult>;
}

@Injectable()
export class FalProvider implements AIProvider {
  async generate(prompt: string) { /* ... */ }
}

@Injectable()
export class GenerationService {
  constructor(
    @Inject('AI_PROVIDER') private provider: AIProvider // Abstraction
  ) {}

  async generate(prompt: string) {
    return this.provider.generate(prompt);
  }
}
```

---

## Service Structure Template

When creating a new service, follow this structure:

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

/**
 * Service description - what this service is responsible for
 */
@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  constructor(
    private readonly db: DatabaseService,
    // Inject other dependencies via abstractions
  ) {}

  /**
   * Method description
   * @param id - Parameter description
   * @returns Return value description
   * @throws NotFoundException when resource not found
   */
  async findOne(id: string): Promise<Example> {
    const result = await this.db.getOne<Example>(
      'SELECT * FROM examples WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new NotFoundException(`Example with ID "${id}" not found`);
    }

    return result;
  }
}
```

---

## File Organization

```
src/modules/
└── example/
    ├── index.ts                 # Barrel exports
    ├── example.module.ts        # Module definition
    ├── example.controller.ts    # HTTP endpoints
    ├── example.service.ts       # Business logic
    ├── example.routes.ts        # Route constants
    └── dto/
        ├── index.ts
        ├── create-example.dto.ts
        └── update-example.dto.ts
```

---

## Route File Convention

All routes must be defined in a separate `*.routes.ts` file:

```typescript
// example.routes.ts
export const EXAMPLE_ROUTES = {
  BASE: 'examples',
  BY_ID: ':id',
  PROCESS: ':id/process',
} as const;

export const EXAMPLE_ROUTE_DESCRIPTIONS = {
  FIND_ALL: 'Get all examples',
  FIND_ONE: 'Get example by ID',
  CREATE: 'Create new example',
  UPDATE: 'Update example',
  DELETE: 'Delete example',
  PROCESS: 'Process example',
} as const;
```

---

## DTO Guidelines

1. Use `class-validator` decorators for validation
2. Use `class-transformer` for transformation
3. Document with Swagger decorators

```typescript
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExampleDto {
  @ApiProperty({ description: 'Name of the example', example: 'My Example' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description', example: 'Optional desc' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
```

---

## Database Query Guidelines

1. **Use parameterized queries** - Never interpolate variables into SQL
2. **Use `?` placeholders** - Auto-converted to PostgreSQL `$1, $2`
3. **Parse JSON fields** - Database stores JSON as strings

```typescript
// ✅ Correct
const user = await this.db.getOne<User>(
  'SELECT * FROM users WHERE id = ? AND status = ?',
  [userId, 'active']
);

// Parse JSON fields from database
const parsed = {
  ...user,
  settings: typeof user.settings === 'string' 
    ? JSON.parse(user.settings) 
    : user.settings
};

// ❌ Wrong - SQL injection risk
const user = await this.db.getOne(`SELECT * FROM users WHERE id = '${userId}'`);
```

---

## Error Handling

Use NestJS built-in exceptions:

```typescript
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

// Resource not found
throw new NotFoundException('User not found');

// Invalid input
throw new BadRequestException('Invalid email format');

// Not authenticated
throw new UnauthorizedException('Please login');

// No permission
throw new ForbiddenException('Access denied');

// Duplicate/conflict
throw new ConflictException('Email already exists');
```

---

## Checklist Before Submitting

- [ ] Service has single responsibility
- [ ] Dependencies injected via constructor (DIP)
- [ ] Uses interfaces/abstractions where appropriate
- [ ] Routes defined in separate `*.routes.ts`
- [ ] DTOs have validation decorators
- [ ] Swagger documentation added
- [ ] Parameterized queries used (no SQL injection)
- [ ] JSON fields parsed correctly
- [ ] Proper error handling with NestJS exceptions
- [ ] Logger used instead of `console.log`
