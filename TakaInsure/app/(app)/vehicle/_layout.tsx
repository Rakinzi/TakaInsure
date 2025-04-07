import { Stack } from 'expo-router';

export default function VehicleLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'My Vehicles',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="capture"
        options={{
          title: 'Add Vehicle',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="details"
        options={{
          title: 'Vehicle Details',
          headerShown: true,
        }}
      />
    </Stack>
  );
}