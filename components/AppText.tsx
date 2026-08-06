import React from 'react'
import { Text as RNText, StyleSheet, TextProps } from 'react-native'

export default function Text({ style, ...props }: TextProps) {

    const flatStyle = StyleSheet.flatten(style) || {}

    let chosenFont = 'Inter-Regular'

    if (flatStyle.fontWeight === 'bold' || flatStyle.fontWeight === '700') {
        chosenFont = 'Inter-Bold'
    } else if (flatStyle.fontWeight === '600' || flatStyle.fontWeight === '500') {
        chosenFont = 'Inter-Semibold'
    }
    return (
        <RNText
            {...props}
            style={[
                {
                    fontFamily: chosenFont,
                    paddingRight: 4
                },

                style,
                { fontWeight: undefined }
            ]}
        />
    )
}
