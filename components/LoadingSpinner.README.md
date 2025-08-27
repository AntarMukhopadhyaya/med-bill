# LoadingSpinner Component

A generic, reusable loading spinner component that can be used throughout the application.

## Import

```tsx
import {
  LoadingSpinner,
  OverlaySpinner,
  CardSpinner,
  MinimalSpinner,
} from "@/components/LoadingSpinner";
```

## Basic Usage

### Default Spinner

```tsx
<LoadingSpinner message="Loading data..." size="large" />
```

### Minimal Spinner (just the spinner, no message)

```tsx
<MinimalSpinner size="small" />
```

### Card Variant (with background card)

```tsx
<CardSpinner message="Processing payment..." color="#10B981" />
```

### Overlay Spinner (covers entire screen/container)

```tsx
<OverlaySpinner message="Saving changes..." overlayColor="rgba(0, 0, 0, 0.5)" />
```

## Props

| Prop           | Type                               | Default                      | Description                       |
| -------------- | ---------------------------------- | ---------------------------- | --------------------------------- |
| `size`         | `"small" \| "large"`               | `"large"`                    | Size of the activity indicator    |
| `message`      | `string`                           | `"Loading..."`               | Text to display below the spinner |
| `color`        | `string`                           | `colors.primary[500]`        | Color of the spinner              |
| `style`        | `ViewStyle`                        | `undefined`                  | Additional styles for container   |
| `overlay`      | `boolean`                          | `false`                      | Whether to show as overlay        |
| `overlayColor` | `string`                           | `"rgba(255, 255, 255, 0.9)"` | Background color for overlay      |
| `variant`      | `"default" \| "card" \| "minimal"` | `"default"`                  | Visual variant                    |

## Usage Examples in Different Contexts

### 1. Page Content Loading (like in invoices page)

```tsx
{isLoading ? (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <LoadingSpinner
      size="large"
      message="Loading invoices..."
      variant="default"
    />
  </View>
) : (
  // Your content here
)}
```

### 2. Button Loading State

```tsx
<Button
  title={isSubmitting ? "" : "Save"}
  onPress={handleSubmit}
  disabled={isSubmitting}
  icon={isSubmitting ? undefined : "save"}
  rightElement={isSubmitting ? <MinimalSpinner size="small" /> : undefined}
/>
```

### 3. Modal/Form Loading

```tsx
<CardSpinner message="Saving customer..." style={{ margin: 20 }} />
```

### 4. Full Screen Overlay

```tsx
{
  isSyncing && (
    <OverlaySpinner
      message="Syncing data..."
      overlayColor="rgba(0, 0, 0, 0.7)"
    />
  );
}
```

### 5. Inline Loading (in lists, cards, etc.)

```tsx
<MinimalSpinner
  size="small"
  color={colors.gray[500]}
  style={{ marginLeft: 10 }}
/>
```

## Variants

### Default

- Simple spinner with optional message
- Good for content areas

### Card

- Spinner in a card-like container with shadow
- Good for modals and forms

### Minimal

- Just the spinner, no background or message
- Good for inline use, buttons, small spaces

### Overlay

- Covers the entire container/screen
- Good for full-page loading states

## Accessibility

The component automatically includes:

- Proper activity indicator for screen readers
- Clear loading messages
- Appropriate contrast colors

## Performance

- Uses React.memo internally for optimization
- Minimal re-renders
- Lightweight implementation
