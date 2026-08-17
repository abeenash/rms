import React from 'react'
import { Text as RNText, StyleSheet, TextProps } from 'react-native'

export default function Text({ style, ...props }: TextProps) {

    const flatStyle = StyleSheet.flatten(style) || {}
    const weightStr = String(flatStyle.fontWeight || '')

    let chosenFont = 'Inter-Regular'

    if (weightStr === 'bold' || weightStr === '700' || weightStr === '800' || weightStr === '900') {
        chosenFont = 'Inter-Bold'
    } else if (weightStr === '600' || weightStr === '500' || weightStr === 'semibold') {
        chosenFont = 'Inter-Semibold'
    }
    return (
        <RNText
            {...props}
            style={[
                {
                    fontFamily: chosenFont,
                },

                style,
                { fontWeight: undefined }
            ]}
        />
    )
}
