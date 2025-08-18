import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  Input, 
  TextArea,
  Text, 
  Heading, 
  Subtitle, 
  Body, 
  Caption, 
  Label, 
  Code, 
  Link 
} from './index';

/**
 * Comprehensive demo showcasing all Phase 2 dark-first components
 * This tests integration with ThemeProvider and glass effects
 */
export function ThemeDemo() {
  const { activeTheme, mode, toggleTheme } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [textAreaValue, setTextAreaValue] = useState('');

  return (
    <ScrollView className="flex-1 bg-bg-app">
      <View className="p-component-lg space-y-component-lg">
        
        {/* Theme Control Section */}
        <Card variant="elevated" visualStyle="info" padding="lg">
          <CardHeader>
            <Heading level={2}>Dark Theme System Demo</Heading>
            <Caption>
              Current theme: {activeTheme} (mode: {mode})
            </Caption>
          </CardHeader>
          
          <CardContent>
            <Button onPress={toggleTheme} variant="primary" size="md">
              Toggle Theme
            </Button>
          </CardContent>
        </Card>

        {/* Button Variants */}
        <Card surface="card" variant="default" padding="lg">
          <CardHeader>
            <Heading level={3}>Button Variants</Heading>
            <Caption>All button styles with glass effects</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-sm">
              <Button variant="primary" size="lg">Primary Large</Button>
              <Button variant="secondary" size="md">Secondary Medium</Button>
              <Button variant="outline" size="sm">Outline Small</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="glass">Glass Effect</Button>
              <Button variant="primary" loading>Loading State</Button>
              <Button variant="primary" disabled>Disabled State</Button>
            </View>
          </CardContent>
        </Card>

        {/* Button Visual Styles */}
        <Card surface="card" variant="default" padding="lg">
          <CardHeader>
            <Heading level={3}>Button Visual Styles</Heading>
            <Caption>Status-aware button coloring</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-sm">
              <Button variant="primary" visualStyle="success">Success Primary</Button>
              <Button variant="primary" visualStyle="warning">Warning Primary</Button>
              <Button variant="primary" visualStyle="danger">Danger Primary</Button>
              <Button variant="secondary" visualStyle="success">Success Secondary</Button>
              <Button variant="outline" visualStyle="warning">Warning Outline</Button>
              <Button variant="glass" visualStyle="danger">Danger Glass</Button>
            </View>
          </CardContent>
        </Card>

        {/* Card Variants */}
        <Card surface="card" variant="default" padding="lg">
          <CardHeader>
            <Heading level={3}>Card Variants</Heading>
            <Caption>Different card styles and surfaces</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-md">
              <Card variant="default" padding="md">
                <Body>Default Card with surface background</Body>
              </Card>
              
              <Card variant="elevated" padding="md">
                <Body>Elevated Card with enhanced shadow</Body>
              </Card>
              
              <Card variant="glass" padding="md">
                <Body>Glass Card with backdrop blur effect</Body>
              </Card>
              
              <Card variant="outline" padding="md">
                <Body>Outline Card with transparent background</Body>
              </Card>
              
              <Card variant="interactive" interactive padding="md">
                <Body>Interactive Card (try pressing)</Body>
              </Card>
            </View>
          </CardContent>
        </Card>

        {/* Card Visual Styles */}
        <Card surface="card" variant="default" padding="lg">
          <CardHeader>
            <Heading level={3}>Card Status Styles</Heading>
            <Caption>Status-aware card coloring</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-sm">
              <Card variant="elevated" visualStyle="success" padding="sm">
                <Caption>Success Card</Caption>
              </Card>
              
              <Card variant="elevated" visualStyle="warning" padding="sm">
                <Caption>Warning Card</Caption>
              </Card>
              
              <Card variant="elevated" visualStyle="danger" padding="sm">
                <Caption>Danger Card</Caption>
              </Card>
              
              <Card variant="glass" visualStyle="info" padding="sm">
                <Caption>Info Glass Card</Caption>
              </Card>
            </View>
          </CardContent>
        </Card>

        {/* Input Components */}
        <Card surface="card" variant="default" padding="lg">
          <CardHeader>
            <Heading level={3}>Input Components</Heading>
            <Caption>Dark theme inputs with validation</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-md">
              <Input
                label="Default Input"
                placeholder="Enter some text..."
                value={inputValue}
                onChangeText={setInputValue}
                helperText="This is helper text"
              />
              
              <Input
                label="Glass Input"
                variant="glass"
                placeholder="Glass effect input..."
                helperText="Glass variant with backdrop blur"
              />
              
              <Input
                label="Success State"
                variant="outline"
                placeholder="Valid input..."
                successMessage="This input is valid!"
              />
              
              <Input
                label="Error State"
                placeholder="Invalid input..."
                errorMessage="This field is required"
              />
              
              <Input
                label="Password Input"
                placeholder="Enter password..."
                showPasswordToggle
                secureTextEntry
              />
              
              <TextArea
                label="Text Area"
                placeholder="Enter multiline text..."
                value={textAreaValue}
                onChangeText={setTextAreaValue}
                numberOfLines={4}
                helperText="This is a text area component"
              />
            </View>
          </CardContent>
        </Card>

        {/* Typography Components */}
        <Card surface="card" variant="default" padding="lg">
          <CardHeader>
            <Heading level={3}>Typography System</Heading>
            <Caption>Semantic text hierarchy for dark theme</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-sm">
              <Heading level={1}>Heading Level 1</Heading>
              <Heading level={2}>Heading Level 2</Heading>
              <Heading level={3}>Heading Level 3</Heading>
              
              <Subtitle size="lg">Large Subtitle</Subtitle>
              <Subtitle>Regular Subtitle</Subtitle>
              
              <Body>This is body text with primary color.</Body>
              <Body variant="secondary">This is secondary body text.</Body>
              <Body variant="muted">This is muted body text.</Body>
              
              <Caption>This is caption text for secondary information.</Caption>
              
              <Label>Form Label Text</Label>
              
              <View className="flex-row items-center space-x-2">
                <Text>Inline code: </Text>
                <Code>npm install</Code>
              </View>
              
              <Link>This is a clickable link</Link>
            </View>
          </CardContent>
        </Card>

        {/* Text Visual Styles */}
        <Card surface="card" variant="default" padding="lg">
          <CardHeader>
            <Heading level={3}>Text Status Colors</Heading>
            <Caption>Status-aware text coloring</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-xs">
              <Text visualStyle="success">Success text color</Text>
              <Text visualStyle="warning">Warning text color</Text>
              <Text visualStyle="danger">Danger text color</Text>
              <Text visualStyle="info">Info text color</Text>
            </View>
          </CardContent>
        </Card>

        {/* Glass Effects Showcase */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <Heading level={3}>Glass Effects</Heading>
            <Caption>Backdrop blur and transparency effects</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-md">
              <Button variant="glass" size="lg">Glass Button</Button>
              
              <Input
                variant="glass"
                placeholder="Glass input with blur..."
                helperText="Glass input variant"
              />
              
              <Card variant="glass" padding="md">
                <Text>Nested glass card inside glass card</Text>
              </Card>
            </View>
          </CardContent>
          
          <CardFooter>
            <Caption>Glass effects work best over complex backgrounds</Caption>
          </CardFooter>
        </Card>

        {/* Component Integration Test */}
        <Card surface="elevated" variant="elevated" padding="lg">
          <CardHeader>
            <Heading level={3}>Complete Form Example</Heading>
            <Caption>All components working together</Caption>
          </CardHeader>
          
          <CardContent>
            <View className="space-y-component-md">
              <Input
                label="Full Name"
                placeholder="John Doe"
                required
              />
              
              <Input
                label="Email"
                placeholder="john@example.com"
                keyboardType="email-address"
                required
              />
              
              <Input
                label="Password"
                placeholder="••••••••"
                showPasswordToggle
                secureTextEntry
                required
              />
              
              <TextArea
                label="Bio"
                placeholder="Tell us about yourself..."
                numberOfLines={3}
              />
              
              <View className="flex-row space-x-component-sm">
                <Button variant="primary" className="flex-1">
                  Save
                </Button>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>
        
        {/* Bottom spacing */}
        <View className="h-component-xl" />
      </View>
    </ScrollView>
  );
}