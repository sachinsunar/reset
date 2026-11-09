import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type MascotMood = 'idle' | 'greeting' | 'celebrate' | 'support' | 'newday';

interface ResetMascotProps {
  size?: number;
  mood?: MascotMood;
}

const LABELS: Record<MascotMood, string> = {
  idle: 'Reset, your cheerful yellow routine buddy',
  greeting: 'Reset is waving hello',
  celebrate: 'Reset is celebrating with you',
  support: 'Reset is here to keep you company',
  newday: 'Reset is ready for a fresh day',
};

export function ResetMascot({ size = 118, mood = 'idle' }: ResetMascotProps) {
  const reduceMotion = useReducedMotion();
  const bounce = useSharedValue(0);
  const wave = useSharedValue(0);
  const blink = useSharedValue(1);
  const cheer = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(bounce);
    cancelAnimation(wave);
    cancelAnimation(blink);
    cancelAnimation(cheer);

    wave.value = 0;
    cheer.value = 0;

    if (reduceMotion) {
      bounce.value = 0;
      blink.value = 1;
      return;
    }

    bounce.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    blink.value = withRepeat(
      withSequence(
        withDelay(2100, withTiming(0.12, { duration: 90 })),
        withTiming(1, { duration: 130 }),
        withDelay(2500, withTiming(0.12, { duration: 90 })),
        withTiming(1, { duration: 130 }),
      ),
      -1,
    );

    if (mood === 'greeting' || mood === 'newday' || mood === 'celebrate') {
      wave.value = withRepeat(
        withSequence(
          withTiming(-18, { duration: 260, easing: Easing.out(Easing.quad) }),
          withTiming(14, { duration: 260, easing: Easing.inOut(Easing.quad) }),
        ),
        3,
      );
      bounce.value = withSequence(
        withTiming(-11, { duration: 220 }),
        withSpring(0, { damping: 8, stiffness: 180 }),
        withDelay(420, withTiming(-7, { duration: 190 })),
        withSpring(0, { damping: 9, stiffness: 170 }),
        withRepeat(
          withSequence(
            withTiming(-2.5, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        ),
      );
    }

    if (mood === 'celebrate') {
      cheer.value = withSequence(
        withTiming(1, { duration: 180 }),
        withDelay(700, withTiming(0, { duration: 260 })),
      );
    }

    if (mood === 'support') {
      bounce.value = withRepeat(
        withSequence(
          withTiming(-1.5, { duration: 2300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    }
  }, [mood, reduceMotion, bounce, wave, blink, cheer]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));
  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wave.value - 8}deg` }],
  }));
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: cheer.value,
    transform: [{ scale: 0.7 + cheer.value * 0.5 }, { rotate: `${cheer.value * 18}deg` }],
  }));

  const s = size;
  const bodyWidth = s * 0.72;
  const bodyHeight = s * 0.64;
  const eyeWidth = Math.max(5, s * 0.062);
  const eyeHeight = Math.max(7, s * 0.087);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABELS[mood]}
      style={{ width: s, height: s }}
    >
      <View
        style={[
          styles.shadow,
          {
            width: bodyWidth * 0.8,
            height: s * 0.07,
            borderRadius: s,
            left: (s - bodyWidth * 0.8) / 2,
            bottom: s * 0.02,
          },
        ]}
      />

      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <View
          style={[
            styles.stem,
            {
              width: s * 0.035,
              height: s * 0.12,
              left: s * 0.487,
              top: s * 0.045,
            },
          ]}
        />
        <View
          style={[
            styles.leaf,
            {
              width: s * 0.17,
              height: s * 0.09,
              borderRadius: s,
              backgroundColor: '#B94DF2',
              left: s * 0.35,
              top: s * 0.07,
              transform: [{ rotate: '-28deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.leaf,
            {
              width: s * 0.15,
              height: s * 0.08,
              borderRadius: s,
              backgroundColor: '#00C9C7',
              left: s * 0.5,
              top: s * 0.035,
              transform: [{ rotate: '26deg' }],
            },
          ]}
        />

        <View
          style={[
            styles.foot,
            {
              width: s * 0.19,
              height: s * 0.11,
              borderRadius: s,
              left: s * 0.22,
              bottom: s * 0.075,
              transform: [{ rotate: '-9deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.foot,
            {
              width: s * 0.19,
              height: s * 0.11,
              borderRadius: s,
              right: s * 0.22,
              bottom: s * 0.075,
              transform: [{ rotate: '9deg' }],
            },
          ]}
        />

        <View
          style={[
            styles.body,
            {
              width: bodyWidth,
              height: bodyHeight,
              borderRadius: s * 0.32,
              left: (s - bodyWidth) / 2,
              top: s * 0.23,
            },
          ]}
        >
          <View
            style={[
              styles.belly,
              {
                width: bodyWidth * 0.55,
                height: bodyHeight * 0.3,
                borderRadius: s,
                left: bodyWidth * 0.225,
                bottom: bodyHeight * 0.1,
              },
            ]}
          />
          <View style={[styles.eyeRow, { top: bodyHeight * 0.32 }]}>
            <Animated.View
              style={[
                styles.eye,
                { width: eyeWidth, height: eyeHeight, borderRadius: eyeWidth },
                eyeStyle,
              ]}
            >
              <View style={[styles.glint, { width: eyeWidth * 0.34, height: eyeWidth * 0.34 }]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.eye,
                { width: eyeWidth, height: eyeHeight, borderRadius: eyeWidth },
                eyeStyle,
              ]}
            >
              <View style={[styles.glint, { width: eyeWidth * 0.34, height: eyeWidth * 0.34 }]} />
            </Animated.View>
          </View>
          <View style={[styles.cheekRow, { top: bodyHeight * 0.51 }]}>
            <View style={[styles.cheek, { width: s * 0.07, height: s * 0.037 }]} />
            <View style={[styles.cheek, { width: s * 0.07, height: s * 0.037 }]} />
          </View>
          <View
            style={[
              styles.mouth,
              {
                width: s * 0.105,
                height: s * 0.052,
                borderRadius: s,
                left: bodyWidth / 2 - s * 0.0525,
                top: bodyHeight * 0.6,
              },
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.arm,
            {
              width: s * 0.18,
              height: s * 0.095,
              borderRadius: s,
              right: s * 0.055,
              top: s * 0.48,
              transformOrigin: 'left center',
            },
            armStyle,
          ]}
        />
        <View
          style={[
            styles.arm,
            {
              width: s * 0.17,
              height: s * 0.09,
              borderRadius: s,
              left: s * 0.06,
              top: s * 0.5,
              transform: [{ rotate: '12deg' }],
              transformOrigin: 'right center',
            },
          ]}
        />

        <Animated.View style={[styles.sparkles, { top: s * 0.06, right: s * 0.03 }, sparkleStyle]}>
          <View style={[styles.sparkle, { width: s * 0.055, height: s * 0.055 }]} />
          <View style={[styles.sparkleSmall, { width: s * 0.03, height: s * 0.03 }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const OUTLINE = '#171717';

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(23,23,23,0.12)',
    transform: [{ scaleY: 0.55 }],
  },
  stem: { position: 'absolute', borderRadius: 99, backgroundColor: '#008F8D' },
  leaf: { position: 'absolute', borderWidth: 2, borderColor: OUTLINE },
  body: {
    position: 'absolute',
    backgroundColor: '#FFF12E',
    borderWidth: 2.5,
    borderColor: OUTLINE,
    shadowColor: '#171717',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
  belly: { position: 'absolute', backgroundColor: '#FFFBE8', opacity: 0.82 },
  eyeRow: {
    position: 'absolute',
    left: '23%',
    right: '23%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eye: { backgroundColor: OUTLINE, alignItems: 'center', justifyContent: 'flex-start' },
  glint: { backgroundColor: '#FFFFFF', borderRadius: 99, marginTop: 1.5, marginLeft: 1.5 },
  cheekRow: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cheek: { backgroundColor: '#F0A7FF', borderRadius: 99, opacity: 0.9 },
  mouth: {
    position: 'absolute',
    borderBottomWidth: 2.2,
    borderLeftWidth: 1.6,
    borderRightWidth: 1.6,
    borderColor: OUTLINE,
  },
  arm: {
    position: 'absolute',
    backgroundColor: '#FFF12E',
    borderWidth: 2.4,
    borderColor: OUTLINE,
  },
  foot: {
    position: 'absolute',
    backgroundColor: '#FFF12E',
    borderWidth: 2.4,
    borderColor: OUTLINE,
  },
  sparkles: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  sparkle: { backgroundColor: '#B94DF2', borderRadius: 2, transform: [{ rotate: '45deg' }] },
  sparkleSmall: { backgroundColor: '#00C9C7', borderRadius: 99 },
});
