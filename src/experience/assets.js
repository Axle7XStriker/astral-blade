/** Contains a list of assets that the experience leverages. */
export default [
    {
        name: "base",
        data: {},
        items: [{ name: "lennaTexture", source: "/assets/lenna.png", type: "texture" }],
    },
    {
        name: "HUD",
        data: {},
        items: [
            { name: "hudBoundary", source: "/assets/hud-boundary.svg", type: "vector-graphic" },
            { name: "feedbackIcon", source: "/assets/feedback-icon.svg", type: "vector-graphic" },
        ],
    },
    {
        name: "Back",
        data: {},
        items: [
            { name: "backIndicator", source: "/assets/back-indicator.svg", type: "vector-graphic" },
        ],
    },
    {
        name: "SelfPics",
        data: {},
        items: [{ name: "myFace", source: "/assets/ab_face.png", type: "texture" }],
    },
    {
        name: "MusicIllustrations",
        data: {},
        items: [
            {
                name: "listening",
                source: "/assets/listening-happy-music-rafiki.svg",
                type: "vector-graphic",
            },
            {
                name: "singing",
                source: "/assets/friends-singing-christmas-carol-amico.svg",
                type: "vector-graphic",
            },
            {
                name: "composing",
                source: "/assets/compose-music-pana.svg",
                type: "vector-graphic",
            },
        ],
    },
    {
        name: "FitnessIllustrations",
        data: {},
        items: [
            {
                name: "jogging",
                source: "/assets/jogging-rafiki.svg",
                type: "vector-graphic",
            },
            {
                name: "workout",
                source: "/assets/workout-cuate.svg",
                type: "vector-graphic",
            },
            {
                name: "football",
                source: "/assets/football-goal-bro.svg",
                type: "vector-graphic",
            },
        ],
    },
    {
        name: "FunActivites",
        data: {},
        items: [
            { name: "travelCar", source: "/assets/shelbygtr/scene.gltf", type: "3d-model" },
        ],
    }
];
