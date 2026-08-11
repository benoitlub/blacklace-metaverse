# Unity Bridge

This directory contains the minimal Unity-side bridge for `metaverse-creator`.

## Design goals

- No Blacklace-specific logic.
- No provider-specific URLs hard-coded in C#.
- Bridge endpoint is configurable in the Unity Editor.
- Protocol version is explicit.
- The bridge only transports scene data and operations; world rules and generation remain in `metaverse-creator`.

The first implementation will target Unity Editor usage so an existing open scene can be inspected and modified without requiring a separate Unity project runtime.
