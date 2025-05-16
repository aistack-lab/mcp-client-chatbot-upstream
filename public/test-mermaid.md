# Mermaid Diagram Test

This is a sample markdown file to test Mermaid diagrams.

## Simple Flowchart

```mermaid
graph TD;
    A[Start] -->|Action 1| B(Process 1);
    A -->|Action 2| C(Process 2);
    B --> D{Decision};
    C --> D;
    D -->|Yes| E[End Success];
    D -->|No| F[End Failure];
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Database
    
    User->>API: Request data
    API->>Database: Query data
    Database-->>API: Return results
    API-->>User: Response with data
```

## Class Diagram

```mermaid
classDiagram
    class Animal {
        +name: string
        +age: int
        +makeSound()
    }
    class Dog {
        +breed: string
        +makeSound()
    }
    class Cat {
        +color: string
        +makeSound()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Inactive
    Inactive --> Active
    Inactive --> Closed
    Active --> Closed
    Closed --> [*]
```

This page demonstrates the different types of diagrams supported by Mermaid.