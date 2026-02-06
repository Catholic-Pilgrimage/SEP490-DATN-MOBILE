import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../../constants/theme.constants';

const PlanDetailScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Plan Detail Screen</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    text: {
        color: COLORS.textPrimary,
    },
});

export default PlanDetailScreen;
