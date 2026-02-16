import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, ViewStyle } from 'react-native';

interface ScaleButtonProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    scaleTo?: number;
}

export const ScaleButton = ({ children, onPress, style, scaleTo = 0.96 }: ScaleButtonProps) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: scaleTo,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10
        }).start();
    };

    return (
        <TouchableWithoutFeedback
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[style, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};
